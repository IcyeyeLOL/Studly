import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB

router.post('/avatar', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const ext = path.extname(req.file.originalname) || '.jpg';
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

router.post('/attachment', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const ext = path.extname(req.file.originalname) || '';
  const name = `${req.profileId}/${Date.now()}${ext}`;
  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(name, req.file.buffer, { contentType: req.file.mimetype });
  if (error) return res.status(500).json({ error: error.message });
  const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(data.path);
  res.status(201).json({ path: data.path, url: urlData.publicUrl });
});

export const uploadRouter = router;
