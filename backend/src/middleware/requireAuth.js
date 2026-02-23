import { getAuth } from '@clerk/express';
import { supabase } from '../lib/supabase.js';

export async function requireAuth(req, res, next) {
  const auth = getAuth(req);
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const clerkUserId = auth.userId;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Database error' });
  }

  if (profile) {
    req.profileId = profile.id;
    req.clerkUserId = clerkUserId;
    return next();
  }

  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({ clerk_user_id: clerkUserId })
    .select('id')
    .single();

  if (insertError) {
    return res.status(500).json({ error: 'Failed to create profile' });
  }
  req.profileId = newProfile.id;
  req.clerkUserId = clerkUserId;
  next();
}
