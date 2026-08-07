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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        if (!restoredSession) {
          const refreshToken = readRefreshToken();
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (data.session) saveRefreshToken(data.session.refresh_token);
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (data.session) saveRefreshToken(data.session.refresh_token);
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
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

