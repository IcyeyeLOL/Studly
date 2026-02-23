import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.profileId)
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.patch('/', requireAuth, async (req, res) => {
  const allowed = [
    'display_name',
    'profile_image_url',
    'appearance',
    'default_output',
    'notifications_enabled',
    'onboarding_data',
  ];
  const body = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) body[key] = req.body[key];
  }
  body.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('id', req.profileId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export const profileRouter = router;
