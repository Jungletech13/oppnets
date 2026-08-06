import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard, Users, ShieldCheck, AlertTriangle, FolderKanban, ScrollText,
  CreditCard, Menu, X, ArrowLeft,
} from 'lucide-react';
import { useApp, type Route } from '@/store';
import { Avatar } from './ui';
import { useAuth } from '@/lib/auth';

const ADMIN_NAV: { label: string; route: Route; icon: typeof LayoutDashboard }[] = [
  { label: 'Dashboard', route: { name: 'admin' }, icon: LayoutDashboard },
  { label: 'Users', route: { name: 'admin-users' }, icon: Users },
  { label: 'Verification', route: { name: 'admin-verification' }, icon: ShieldCheck },
  { label: 'Moderation', route: { name: 'admin-moderation' }, icon: AlertTriangle },
  { label: 'Collaborations', route: { name: 'admin-collaborations' }, icon: FolderKanban },
  { label: 'Audit Log', route: { name: 'admin-audit' }, icon: ScrollText },
  { label: 'Subscriptions', route: { name: 'admin-subscriptions' }, icon: CreditCard },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { route, navigate } = useApp();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-ink-900 text-white flex items-center justify-center font-bold text-sm">A</div>
        <div className="font-semibold text-ink-900 leading-tight">
          OppNets<span className="text-ink-500"> Admin</span>
        </div>
      </div>
      <div className="px-3 mb-2">
        <button onClick={() => navigate({ name: 'home' })} className="btn-secondary w-full">
          <ArrowLeft className="w-4 h-4" />
          Back to App
        </button>
      </div>
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {ADMIN_NAV.map((item) => {
          const active = route.name === item.route.name;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => { navigate(item.route); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-ink-200">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar name={user?.email ?? 'Admin'} size={32} />
          <div className="text-left min-w-0">
            <div className="text-sm font-medium text-ink-800 truncate">{user?.email}</div>
            <div className="text-xs text-ink-500">Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-ink-200 flex-col z-30">
        {sidebar}
      </aside>

      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-ink-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-ink-900 text-white flex items-center justify-center font-bold text-xs">A</div>
          <span className="font-semibold text-ink-900 text-sm">OppNets Admin</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="p-2 -mr-2 text-ink-600">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[80%] bg-white shadow-xl flex flex-col animate-fadein">
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 right-3 text-ink-400 z-10">
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
