/*
  My Photo TV
  Setup: apne Supabase Project URL aur anon/publishable key ko neeche paste karein.
  Sirf public anon/publishable key use karein. service_role/secret key kabhi paste na karein.
*/
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE";
const BUCKET = "photos";

const $ = (id) => document.getElementById(id);
const configReady = SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("PASTE_") && SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes("PASTE_");

let supabaseClient = null;
let currentUser = null;
let imageUrls = [];

function setStatus(id, message) { $(id).textContent = message; }
function safeName(name) {
  return (name || "photo").replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(-100);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function showAuth() {
  $("authPanel").classList.toggle("hidden", !!currentUser);
  $("appPanel").classList.toggle("hidden", !currentUser);
  if (currentUser) $("accountLabel").textContent = currentUser.email || "Signed in";
}
async function signUp() {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || password.length < 8) {
    setStatus("authStatus", "Email daalein aur password kam se kam 8 characters ka rakhein.");
    return;
  }
  setStatus("authStatus", "Account ban raha hai...");
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) return setStatus("authStatus", "Error: " + error.message);
  setStatus("authStatus", "Account request ho gayi. Agar email verification maange, inbox mein verification complete karke phir sign in karein.");
}
async function signIn() {
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return setStatus("authStatus", "Email aur password dono daalein.");
  setStatus("authStatus", "Sign in ho raha hai...");
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) return setStatus("authStatus", "Sign in nahi hua: " + error.message);
  setStatus("authStatus", "Sign in ho gaya.");
}
async function signOut() {
  await supabaseClient.auth.signOut();
  imageUrls.forEach(URL.revokeObjectURL);
  imageUrls = [];
  currentUser = null;
  $("gallery").replaceChildren();
  showAuth();
}
async function uploadPhotos() {
  const files = Array.from($("photoFiles").files || []);
  if (!files.length) return setStatus("appStatus", "Pehle gallery se ek ya zyada photos chunein.");
  $("uploadBtn").disabled = true;
  let success = 0;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.type.startsWith("image/")) continue;
    setStatus("appStatus", `Upload ho raha hai: ${i + 1}/${files.length} — ${file.name}`);
    const path = `${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error } = await supabaseClient.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type
    });
    if (error) {
      setStatus("appStatus", `Upload mein dikkat: ${file.name} — ${error.message}. Storage policy/limit check karein.`);
    } else success++;
  }
  $("uploadBtn").disabled = false;
  $("photoFiles").value = "";
  setStatus("appStatus", `${success} photo(s) upload ho gayi. Gallery refresh ho rahi hai...`);
  await loadPhotos();
}
async function deletePhoto(path) {
  if (!confirm("Kya is photo ko permanently delete karna hai?")) return;
  const { error } = await supabaseClient.storage.from(BUCKET).remove([path]);
  if (error) setStatus("appStatus", "Delete error: " + error.message);
  else { setStatus("appStatus", "Photo delete ho gayi."); await loadPhotos(); }
}
async function loadPhotos() {
  if (!currentUser) return;
  imageUrls.forEach(URL.revokeObjectURL);
  imageUrls = [];
  $("gallery").replaceChildren();
  setStatus("appStatus", "Photos load ho rahi hain...");
  const { data, error } = await supabaseClient.storage.from(BUCKET).list("", {
    limit: 100, sortBy: { column: "created_at", order: "desc" }
  });
  if (error) {
    setStatus("appStatus", "Photos load nahi hui: " + error.message + ". README mein Storage policies check karein.");
    return;
  }
  const photos = (data || []).filter(item => item && item.name && item.id);
  if (!photos.length) {
    setStatus("appStatus", "Abhi koi photo nahi hai. Mobile par Upload photos karein.");
    return;
  }
  setStatus("appStatus", `${photos.length} photo(s) milin.`);
  for (const item of photos) {
    const path = item.name;
    const { data: blob, error: downloadError } = await supabaseClient.storage.from(BUCKET).download(path);
    if (downloadError || !blob) continue;
    const objectUrl = URL.createObjectURL(blob);
    imageUrls.push(objectUrl);
    const card = document.createElement("article");
    card.className = "photo";
    const img = document.createElement("img");
    img.src = objectUrl;
    img.alt = item.name;
    img.loading = "lazy";
    img.addEventListener("click", () => openViewer(objectUrl));
    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = item.name.replace(/^[0-9a-f-]{36}-/i, "");
    const actions = document.createElement("div");
    actions.className = "actions";
    const view = document.createElement("button");
    view.textContent = "Full screen";
    view.addEventListener("click", () => openViewer(objectUrl));
    const remove = document.createElement("button");
    remove.className = "danger";
    remove.textContent = "Delete";
    remove.addEventListener("click", () => deletePhoto(path));
    actions.append(view, remove);
    card.append(img, meta, actions);
    $("gallery").append(card);
  }
}
function openViewer(url) {
  $("viewerImage").src = url;
  $("viewer").classList.remove("hidden");
}
function closeViewer() {
  $("viewer").classList.add("hidden");
  $("viewerImage").src = "";
}
async function init() {
  if (!configReady || !window.supabase) {
    $("configNotice").classList.remove("hidden");
    setStatus("authStatus", "Setup ke liye ZIP ka README_HINDI.txt dekhein.");
    $("signInBtn").disabled = true;
    $("signUpBtn").disabled = true;
    return;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await supabaseClient.auth.getSession();
  currentUser = data.session?.user || null;
  showAuth();
  if (currentUser) loadPhotos();
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    showAuth();
    if (currentUser) loadPhotos();
    else $("gallery").replaceChildren();
  });
  $("signInBtn").addEventListener("click", signIn);
  $("signUpBtn").addEventListener("click", signUp);
  $("signOutBtn").addEventListener("click", signOut);
  $("uploadBtn").addEventListener("click", uploadPhotos);
  $("refreshBtn").addEventListener("click", loadPhotos);
  $("tvBtn").addEventListener("click", async () => {
    document.body.classList.toggle("tv-mode");
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    else await document.documentElement.requestFullscreen?.().catch(() => {});
  });
  $("closeViewer").addEventListener("click", closeViewer);
  $("viewer").addEventListener("click", e => { if (e.target === $("viewer")) closeViewer(); });
}
document.addEventListener("DOMContentLoaded", init);
