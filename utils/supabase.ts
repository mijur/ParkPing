
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseProjectRef = new URL(supabaseUrl).hostname.split('.')[0];

export const supabaseAuthStorageKey = `sb-${supabaseProjectRef}-auth-token`;

export const clearPersistedAuthSession = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const keysToRemove = Object.keys(window.localStorage).filter((key) =>
    key === supabaseAuthStorageKey || key.startsWith(`${supabaseAuthStorageKey}-`)
  );

  keysToRemove.forEach((key) => {
    window.localStorage.removeItem(key);
  });
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: supabaseAuthStorageKey,
  },
});

export default supabase;
        
