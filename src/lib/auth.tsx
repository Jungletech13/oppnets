import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isE2EMode } from '@/lib/runtime';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const E2E_AUTH_STORAGE_KEY = 'oppnets:e2e-authenticated';
function createE2ESession(): Session {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: 'oppnets-e2e-access-token',
    refresh_token: 'oppnets-e2e-refresh-token',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user: {
      id: 'p-me',
      app_metadata: {},
      user_metadata: { name: 'OppNets Test User' },
      aud: 'authenticated',
      created_at: new Date(now * 1000).toISOString(),
      email: 'returning.user@oppnets.test',
    },
  };
}

function hasE2ESession(): boolean {
  return isE2EMode && window.localStorage.getItem(E2E_AUTH_STORAGE_KEY) === 'true';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => hasE2ESession() ? createE2ESession() : null);
  const [loading, setLoading] = useState(!isE2EMode);

  useEffect(() => {
    if (isE2EMode) return;

    // One-release cleanup for refresh tokens written by the retired legacy
    // auth wrapper. Supabase now owns the single persisted session.
    document.cookie = 'oppnets_refresh_token=; Path=/; Secure; SameSite=Lax; Max-Age=0';

    let active = true;
    let initialized = false;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session || initialized) setSession(session);
    });

    const restoreSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (active) setSession(data.session);
      } finally {
        initialized = true;
        if (active) setLoading(false);
      }
    };

    void restoreSession();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = (session?.user?.app_metadata?.role as string | undefined) === 'admin';

  const signUp = async (email: string, password: string) => {
    if (isE2EMode) {
      if (!email.endsWith('@oppnets.test') || password.length < 6) {
        return { error: 'Use an @oppnets.test address and a password of at least 6 characters in E2E mode.' };
      }
      window.localStorage.setItem(E2E_AUTH_STORAGE_KEY, 'true');
      setSession(createE2ESession());
      return { error: null };
    }
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    if (isE2EMode) {
      if (email !== 'returning.user@oppnets.test' || password !== 'OppNetsTest1!') {
        return { error: 'Invalid E2E test credentials.' };
      }
      window.localStorage.setItem(E2E_AUTH_STORAGE_KEY, 'true');
      setSession(createE2ESession());
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (isE2EMode) {
      window.localStorage.removeItem(E2E_AUTH_STORAGE_KEY);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isAdmin, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// The provider and hook intentionally share this module so they use one context.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
