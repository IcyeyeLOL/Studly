import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', req.profileId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', requireAuth, async (req, res) => {
  const name = (req.body.name || 'Untitled').trim() || 'Untitled';
  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: req.profileId, name })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name required' });
  const { data, error } = await supabase
    .from('projects')
    .update({ name })
    .eq('id', id)
    .eq('user_id', req.profileId)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', req.profileId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export const projectsRouter = router;
