import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();
const LIMIT = 20;

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('recent_questions')
    .select('*')
    .eq('user_id', req.profileId)
    .order('created_at', { ascending: false })
    .limit(LIMIT);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', requireAuth, async (req, res) => {
  const { title, subject } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const { data, error } = await supabase
    .from('recent_questions')
    .insert({
      user_id: req.profileId,
      title: String(title).slice(0, 200),
      subject: subject || 'Other',
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export const recentQuestionsRouter = router;
