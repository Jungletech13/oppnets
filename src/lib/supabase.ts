import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const defaultStorageKey = `sb-${projectRef}-auth-token`;
const legacyStorageKey = 'oppnets-auth-session';

const resilientStorage = {
  getItem(key: string) {
    try {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    } catch {
      return window.sessionStorage.getItem(key);
    }
  },
  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Session storage still preserves authentication across page refreshes.
    }
    window.sessionStorage.setItem(key, value);
  },
  removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Continue clearing the session-scoped copy.
    }
    window.sessionStorage.removeItem(key);
  },
};

try {
  const legacySession = window.localStorage.getItem(legacyStorageKey);
  if (legacySession) resilientStorage.setItem(defaultStorageKey, legacySession);
  resilientStorage.removeItem(legacyStorageKey);
} catch {
  // Supabase will report storage failures through its auth APIs. Avoid making
  // the entire application unavailable in browsers that restrict storage.
}

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
