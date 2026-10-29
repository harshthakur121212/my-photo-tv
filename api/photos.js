// My Photo TV API for Vercel Blob.
// Configure a Vercel Blob store and add BLOB_READ_WRITE_TOKEN in Project Settings > Environment Variables.
import { put, list, del } from '@vercel/blob';

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

export const config = { api: { bodyParser: false } };

async function readForm(req) {
  const { default: formidable } = await import('formidable');
  const form = formidable({ multiples: false, maxFileSize: MAX_BYTES, allowEmptyFiles: false });
  const [fields, files] = await form.parse(req);
  const file = Array.isArray(files.photo) ? files.photo[0] : files.photo;
  return file;
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({error:'Vercel Blob Storage सेट नहीं है।'});
      const result = await list({limit: 1000, token: process.env.BLOB_READ_WRITE_TOKEN});
      const photos = result.blobs
        .filter(b => b.pathname.startsWith('my-photo-tv/'))
        .map(b => ({id:b.pathname, name:b.pathname.split('/').pop(), url:b.url, uploadedAt:b.uploadedAt}))
        .sort((a,b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      return res.status(200).json({photos});
    }
    if (req.method === 'POST') {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({error:'Vercel Blob Storage सेट नहीं है।'});
      const file = await readForm(req);
      if (!file) return res.status(400).json({error:'फोटो फ़ाइल नहीं मिली।'});
      if (!ALLOWED.has(file.mimetype)) return res.status(415).json({error:'JPG, PNG, WEBP, GIF या AVIF फोटो चुनें।'});
      if (file.size > MAX_BYTES) return res.status(413).json({error:'एक फोटो अधिकतम 8 MB की हो सकती है।'});
      const fs = await import('node:fs/promises');
      const bytes = await fs.readFile(file.filepath);
      const safeName = (file.originalFilename || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-90);
      const pathname = `my-photo-tv/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const blob = await put(pathname, bytes, {
        access: 'public',
        contentType: file.mimetype,
        addRandomSuffix: false,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      return res.status(201).json({photo:{id:blob.pathname, name:safeName, url:blob.url}});
    }
    if (req.method === 'DELETE') {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({error:'Vercel Blob Storage सेट नहीं है।'});
      const id = String(req.query.id || '');
      if (!id.startsWith('my-photo-tv/')) return res.status(400).json({error:'गलत फोटो ID।'});
      const found = await list({prefix:id, limit:10, token:process.env.BLOB_READ_WRITE_TOKEN});
      const exact = found.blobs.find(b => b.pathname === id);
      if (!exact) return res.status(404).json({error:'फोटो नहीं मिली।'});
      await del(exact.url, {token:process.env.BLOB_READ_WRITE_TOKEN});
      return res.status(200).json({ok:true});
    }
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({error:'Method not allowed'});
  } catch (err) {
    console.error('My Photo TV API error:', err);
    return res.status(500).json({error:'सर्वर पर समस्या आई। Vercel Functions Logs देखें।'});
  }
}
