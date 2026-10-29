MY PHOTO TV — Hindi setup guide
================================

Yeh website mobile gallery se photos upload karne aur TV ke browser par dekhne ke liye hai.
Website files ko Vercel par host karna kaafi nahi hai: photos ke liye cloud storage chahiye.
Is project mein Supabase ka private Storage bucket use hota hai.

IMPORTANT
- Vercel aur Supabase ke free plans ki limits/policies badal sakti hain; free forever ki guarantee nahi.
- Apna password kisi ko na dein.
- Sirf Supabase ka Project URL aur public anon/publishable key app.js mein daalein.
- service_role ya secret key ko app.js mein kabhi na daalein.
- Private photos internet par store hongi; sirf apne bharosemand account ka use karein.

PART 1 — Supabase project aur private bucket
-------------------------------------------
1. Mobile browser mein https://supabase.com kholein aur account banayein/sign in karein.
2. New project banayein. Project name: my-photo-tv. Database password ko safe jagah likh kar rakhein.
3. Project banne ke baad Project Settings → API (ya API Keys) kholein.
4. Project URL copy karein. Public anon key / publishable key copy karein. Secret/service_role key nahi.
5. Storage section kholein → New bucket.
6. Bucket name bilkul `photos` rakhein aur Public bucket OFF/private rakhein.

PART 2 — Storage policies (access control)
------------------------------------------
Storage → Policies (ya bucket ke policies) mein `photos` bucket ke liye policies banayein.
Agar dashboard policy editor SQL maange, SQL Editor mein neeche wala SQL run kar sakte hain:

CREATE POLICY "Owners can view own My Photo TV files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'photos' AND owner_id = (select auth.uid()::text));

CREATE POLICY "Owners can upload own My Photo TV files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'photos' AND owner_id = (select auth.uid()::text));

CREATE POLICY "Owners can delete own My Photo TV files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'photos' AND owner_id = (select auth.uid()::text));

If policy creation says a policy with that name already exists, do not create duplicate; check existing policies first.
If your Supabase project uses a newer Storage ownership setup and owner_id is unavailable, check Supabase's current Storage access-control documentation before changing policies.

PART 3 — Add project keys to app.js
-----------------------------------
1. ZIP extract karein.
2. `app.js` file open karein (Acode app ya text editor).
3. In do lines ko apne project values se replace karein:

const SUPABASE_URL = "PASTE_YOUR_SUPABASE_PROJECT_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY_HERE";

URL aur key ke aas-paas double quotes rehne dein. `app.js` save karein.

PART 4 — Vercel par upload/deploy
---------------------------------
1. ZIP extract karein. Root folder mein `index.html`, `app.js`, `README_HINDI.txt` hone chahiye.
2. Vercel dashboard kholein: https://vercel.com
3. Apne existing project mein files upload/commit karne ka tareeka use karein, ya New Project se Git repository import karein.
4. `index.html` aur `app.js` ko project root mein rakhein (kisi extra nested folder mein nahi).
5. Deploy karein. Deploy Ready hone ke baad Vercel ka domain kholein.
6. Agar project GitHub import se deploy hota hai, changes ko repository ke root mein commit/push karein aur Vercel redeploy hone dein.

PART 5 — Mobile par account banayein aur photos upload karein
-----------------------------------------------------------
1. Website mobile browser mein kholein.
2. Apna email aur kam se kam 8 characters ka strong password daalein.
3. `Naya account banayein` dabayein. Agar email verification maange, email inbox mein verify karein.
4. Sign in karein → `Mobile gallery se photos chunein` → photos select → `Upload photos`.
5. Upload complete hone tak page band na karein.

PART 6 — Samsung TV par photos dekhein
--------------------------------------
1. TV ko internet se connect karein (aapke phone hotspot se bhi ho sakta hai).
2. TV ka Internet Browser kholein aur wahi Vercel website address type karein.
3. Phone par banaye hue SAME email/password se sign in karein.
4. `Refresh` dabayein. Photo par click ya `Full screen` dabayein.
5. TV mode screen ko bada karta hai. TV browser ke hisaab se full-screen feature kaam kar sakta hai.

TROUBLESHOOTING
---------------
- Sign-in error: email/password check karein; agar email verification on hai, pehle email verify karein.
- Upload/list error: bucket ka naam `photos` ho, bucket private ho aur upar wali SELECT/INSERT/DELETE policies sahi hon.
- Photo upload nahi hoti: internet check karein; chhoti photo se test karein; Supabase project limits check karein.
- TV keyboard se type karna mushkil ho sakta hai; email/password ko safe jagah se type karein. Public/shared TV par sign out zaroor karein.
- Website ka link kisi ko milne se photos nahi dikhni chahiye jab tak woh account mein sign in na karein; apna password share na karein.
