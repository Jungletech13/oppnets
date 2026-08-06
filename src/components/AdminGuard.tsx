import type { ReactNode } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
          <p className="text-sm text-ink-500">Loading admin console…</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-ink-900 mb-2">Access Denied</h1>
          <p className="text-sm text-ink-500">
            You do not have permission to access the OppNets administration console.
            Administrator privileges are required to view this area.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
