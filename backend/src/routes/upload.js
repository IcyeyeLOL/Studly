import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const AVATAR_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const ATTACHMENT_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.doc', '.docx']);

function sanitizeExt(originalname) {
  const ext = path.extname(path.basename(originalname || '')).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) ? ext : '';
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 5 MB)' });
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

router.post('/avatar', requireAuth, upload.single('file'), handleMulterError, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  if (!AVATAR_MIME_TYPES.has(req.file.mimetype)) {
    return res.status(400).json({ error: 'Only image files are allowed for avatars (JPEG, PNG, GIF, WebP)' });
  }
  const ext = sanitizeExt(req.file.originalname) || '.jpg';
  const name = `${req.profileId}${ext}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(name, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
  if (uploadError) return res.status(500).json({ error: uploadError.message });
  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(uploadData.path);
  const url = urlData.publicUrl;
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ profile_image_url: url, updated_at: new Date().toISOString() })
    .eq('id', req.profileId);
  if (updateError) return res.status(500).json({ error: updateError.message });
  res.json({ url });
});

router.post('/attachment', requireAuth, upload.single('file'), handleMulterError, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  if (!ATTACHMENT_MIME_TYPES.has(req.file.mimetype)) {
    return res.status(400).json({ error: 'Unsupported file type. Allowed: images, PDF, TXT, DOC/DOCX' });
  }
  const ext = sanitizeExt(req.file.originalname) || '';
  const name = `${req.profileId}/${Date.now()}${ext}`;
  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(name, req.file.buffer, { contentType: req.file.mimetype });
  if (error) return res.status(500).json({ error: error.message });
  const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(data.path);
  res.status(201).json({ path: data.path, url: urlData.publicUrl });
});

export const uploadRouter = router;
