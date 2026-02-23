import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('saved_solutions')
    .select('*')
    .eq('user_id', req.profileId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

router.post('/', requireAuth, async (req, res) => {
  const { question, subject, answer_text, output_preference } = req.body;
  if (!question || !String(question).trim()) return res.status(400).json({ error: 'question required' });
  if (String(question).length > 5000) return res.status(400).json({ error: 'question too long (max 5000 characters)' });
  const { data, error } = await supabase
    .from('saved_solutions')
    .insert({
      user_id: req.profileId,
      question: question || '',
      subject: subject || 'Other',
      answer_text: answer_text ?? '',
      output_preference: output_preference || 'handwritten',
    })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('saved_solutions')
    .delete()
    .eq('id', id)
    .eq('user_id', req.profileId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

export const savedSolutionsRouter = router;
