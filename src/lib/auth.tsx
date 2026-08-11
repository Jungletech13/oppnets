import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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
const e2eMode = import.meta.env.DEV && import.meta.env.VITE_E2E_MODE === 'true';

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
  return e2eMode && window.localStorage.getItem(E2E_AUTH_STORAGE_KEY) === 'true';
}

const refreshCookieName = 'oppnets_refresh_token';

function saveRefreshToken(token: string) {
  document.cookie = `${refreshCookieName}=${encodeURIComponent(token)}; Path=/; Secure; SameSite=Lax`;
}

function readRefreshToken() {
  const prefix = `${refreshCookieName}=`;
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function clearRefreshToken() {
  document.cookie = `${refreshCookieName}=; Path=/; Secure; SameSite=Lax; Max-Age=0`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => hasE2ESession() ? createE2ESession() : null);
  const [loading, setLoading] = useState(!e2eMode);

  useEffect(() => {
    if (e2eMode) return;

    let active = true;
    let initialized = false;

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        saveRefreshToken(session.refresh_token);
        setSession(session);
      } else if (initialized) {
        setSession(null);
      }
    });

    const restoreSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        let restoredSession = data.session;
        const refreshToken = readRefreshToken();

        if (!restoredSession) {
          if (refreshToken) {
            const { data: refreshed } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
            restoredSession = refreshed.session;
          }
        }

        if (active) setSession(restoredSession);
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
    if (e2eMode) {
      if (!email.endsWith('@oppnets.test') || password.length < 6) {
        return { error: 'Use an @oppnets.test address and a password of at least 6 characters in E2E mode.' };
      }
      window.localStorage.setItem(E2E_AUTH_STORAGE_KEY, 'true');
      setSession(createE2ESession());
      return { error: null };
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (data.session) saveRefreshToken(data.session.refresh_token);
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    if (e2eMode) {
      if (email !== 'returning.user@oppnets.test' || password !== 'OppNetsTest1!') {
        return { error: 'Invalid E2E test credentials.' };
      }
      window.localStorage.setItem(E2E_AUTH_STORAGE_KEY, 'true');
      setSession(createE2ESession());
      return { error: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.session) saveRefreshToken(data.session.refresh_token);
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (e2eMode) {
      window.localStorage.removeItem(E2E_AUTH_STORAGE_KEY);
      setSession(null);
      return;
    }
    clearRefreshToken();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isAdmin, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
