import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

// Supabase's default key is stable for a project and survives app releases.
// Migrate the temporary OppNets-specific key introduced by an earlier build so
// users do not have to sign in again when this correction is deployed.
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const defaultStorageKey = `sb-${projectRef}-auth-token`;
const legacyStorageKey = 'oppnets-auth-session';

try {
  if (!window.localStorage.getItem(defaultStorageKey)) {
    const legacySession = window.localStorage.getItem(legacyStorageKey);
    if (legacySession) window.localStorage.setItem(defaultStorageKey, legacySession);
  }
  window.localStorage.removeItem(legacyStorageKey);
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
  },
});
