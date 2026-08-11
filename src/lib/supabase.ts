import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const defaultStorageKey = `sb-${projectRef}-auth-token`;
const resilientStorage = {
  getItem(key: string) {
    try {
      const value = window.localStorage.getItem(key);
      if (value) return value;
    } catch {
      // Fall through to session storage.
    }
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      window.sessionStorage.setItem(key, value);
    }
  },
  removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Continue clearing the session-scoped copy.
    }
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Storage may be unavailable in strict privacy modes.
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: resilientStorage,
    storageKey: defaultStorageKey,
  },
});
