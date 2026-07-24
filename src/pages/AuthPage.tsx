import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, Field, BetaNote } from '@/components/ui';
import { Network, ArrowRight, Mail, Lock, UserPlus, LogIn, AlertCircle } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fn = mode === 'signin' ? signIn : signUp;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) setError(error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ink-50 to-brand-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink-900">Opportunity Network</h1>
            <p className="text-xs text-ink-500">Every connection should lead to an opportunity.</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 btn ${mode === 'signin' ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 border border-ink-200'}`}
            >
              <LogIn className="w-4 h-4" /> Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 btn ${mode === 'signup' ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 border border-ink-200'}`}
            >
              <UserPlus className="w-4 h-4" /> Sign Up
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="email"
                  className="input pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="password"
                  className="input pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </div>
            </Field>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <p className="text-xs text-ink-500 mt-4 text-center">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-brand-600 font-medium hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </Card>

        <BetaNote>Authentication is powered by Supabase. Email confirmation is disabled for this prototype.</BetaNote>
      </div>
    </div>
  );
}
