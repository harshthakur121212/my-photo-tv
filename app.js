const input = document.getElementById('photoInput');
const uploadBtn = document.getElementById('uploadBtn');
const statusEl = document.getElementById('status');
const preview = document.getElementById('preview');
const gallery = document.getElementById('gallery');
const viewer = document.getElementById('viewer');
const largePhoto = document.getElementById('largePhoto');
const caption = document.getElementById('photoCaption');
let selectedFiles = [];
let photos = [];
let currentIndex = 0;

input.addEventListener('change', () => {
  selectedFiles = [...(input.files || [])];
  preview.replaceChildren();
  selectedFiles.forEach(file => {
    const url = URL.createObjectURL(file);
    preview.appendChild(makeTile({url, name:file.name}, false));
  });
  statusEl.textContent = selectedFiles.length
    ? `${selectedFiles.length} फोटो चुनी गई हैं। अब “फोटो अपलोड करें” दबाएँ।`
    : 'अभी कोई फोटो नहीं चुनी गई।';
});

uploadBtn.addEventListener('click', async () => {
  if (!selectedFiles.length) {
    statusEl.textContent = 'पहले “फोटो चुनें” दबाकर फोटो चुनें।';
    return;
  }
  uploadBtn.disabled = true;
  statusEl.textContent = 'फोटो अपलोड हो रही हैं…';
  try {
    for (const file of selectedFiles) {
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch('/api/photos', {method:'POST', body:form});
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `अपलोड असफल (${res.status})`);
    }
    selectedFiles = [];
    input.value = '';
    preview.replaceChildren();
    statusEl.textContent = 'फोटो अपलोड हो गईं! TV पर गैलरी रीफ्रेश करें।';
    await loadPhotos();
  } catch (err) {
    statusEl.textContent = `समस्या: ${err.message}. वेबसाइट को Vercel पर deploy करके फिर कोशिश करें।`;
  } finally {
    uploadBtn.disabled = false;
  }
});

document.getElementById('refreshBtn').addEventListener('click', loadPhotos);
document.getElementById('closeViewer').addEventListener('click', closeViewer);
document.getElementById('prevPhoto').addEventListener('click', () => showPhoto((currentIndex - 1 + photos.length) % photos.length));
document.getElementById('nextPhoto').addEventListener('click', () => showPhoto((currentIndex + 1) % photos.length));
document.addEventListener('keydown', e => {
  if (viewer.classList.contains('hidden')) return;
  if (e.key === 'Escape') closeViewer();
  if (e.key === 'ArrowLeft' && photos.length) showPhoto((currentIndex - 1 + photos.length) % photos.length);
  if (e.key === 'ArrowRight' && photos.length) showPhoto((currentIndex + 1) % photos.length);
});

function makeTile(photo, fromGallery) {
  const tile = document.createElement('div');
  tile.className = 'tile';
  const img = document.createElement('img');
  img.src = photo.url;
  img.alt = photo.name || 'फोटो';
  tile.appendChild(img);
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = photo.name || 'फोटो';
  tile.appendChild(name);
  tile.addEventListener('click', () => {
    if (fromGallery) {
      const index = photos.findIndex(p => p.id === photo.id);
      if (index >= 0) showPhoto(index);
    } else {
      largePhoto.src = photo.url;
      caption.textContent = photo.name || '';
      viewer.classList.remove('hidden');
    }
  });
  if (fromGallery) {
    const del = document.createElement('button');
    del.className = 'delete';
    del.textContent = 'हटाएँ';
    del.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('क्या यह फोटो वेबसाइट से हटानी है?')) return;
      try {
        const res = await fetch(`/api/photos?id=${encodeURIComponent(photo.id)}`, {method:'DELETE'});
        if (!res.ok) throw new Error('फोटो हट नहीं पाई');
        await loadPhotos();
      } catch (err) { alert(err.message); }
    });
    tile.appendChild(del);
  }
  return tile;
}

function showPhoto(index) {
  if (!photos.length) return;
  currentIndex = index;
  largePhoto.src = photos[index].url;
  caption.textContent = `${index + 1} / ${photos.length} · ${photos[index].name}`;
  viewer.classList.remove('hidden');
}
function closeViewer() {
  viewer.classList.add('hidden');
  largePhoto.removeAttribute('src');
}
async function loadPhotos() {
  gallery.replaceChildren();
  try {
    const res = await fetch('/api/photos');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'गैलरी लोड नहीं हुई');
    photos = data.photos || [];
    if (!photos.length) {
      const p = document.createElement('p');
      p.className = 'empty';
      p.textContent = 'अभी कोई फोटो नहीं है। मोबाइल से फोटो अपलोड करें।';
      gallery.appendChild(p);
      return;
    }
    photos.forEach(photo => gallery.appendChild(makeTile(photo, true)));
  } catch (err) {
    gallery.replaceChildren();
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'गैलरी अभी उपलब्ध नहीं है। इसे Vercel पर deploy करने और Storage सेट करने के बाद फोटो दिखेंगी।';
    gallery.appendChild(p);
  }
}
loadPhotos();