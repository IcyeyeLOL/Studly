import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useStudlyStoreImpl } from '../store/useStudlyStore';

/**
 * Syncs Clerk user data (firstName, email) to the Studly store when signed in.
 * Place inside ClerkProvider, only rendered when user is signed in.
 */
export function ClerkUserSync() {
  const { user, isLoaded } = useUser();
  const setUserName = useStudlyStoreImpl((s) => s.setUserName);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    const email = user.primaryEmailAddress?.emailAddress ?? '';
    const display = name || email || '';
    if (display) setUserName(display);
  }, [isLoaded, user, setUserName]);

  return null;
}
