import { useState, type ReactNode } from 'react';
import {
  Home, Compass, Users, Briefcase, LayoutDashboard, MessageSquare, Bell, User, Shield, Settings,
  Menu, X, Plus, Store, Building2, Wrench, DollarSign, Trophy, BookOpen,
} from 'lucide-react';
import { useApp, type Route } from '@/store';
import { Avatar } from './ui';

const NAV: { label: string; route: Route; icon: typeof Home }[] = [
  { label: 'Home', route: { name: 'home' }, icon: Home },
  { label: 'Discover Opportunities', route: { name: 'discover' }, icon: Compass },
  { label: 'People and Teams', route: { name: 'people' }, icon: Users },
  { label: 'My Opportunities', route: { name: 'my-opportunities' }, icon: Briefcase },
  { label: 'Collaboration Spaces', route: { name: 'space', spaceId: 'cs-flip' }, icon: LayoutDashboard },
  { label: 'Messages', route: { name: 'messages' }, icon: MessageSquare },
  { label: 'Notifications', route: { name: 'notifications' }, icon: Bell },
  { label: 'Profile', route: { name: 'profile' }, icon: User },
  { label: 'Trust Center', route: { name: 'trust' }, icon: Shield },
  { label: 'Professionals', route: { name: 'professionals' }, icon: Store },
  { label: 'Companies', route: { name: 'companies' }, icon: Building2 },
  { label: 'Builder Partners', route: { name: 'partners' }, icon: Wrench },
  { label: 'Success Stories', route: { name: 'success-stories' }, icon: Trophy },
  { label: 'Resource Center', route: { name: 'resources' }, icon: BookOpen },
  { label: 'Pricing', route: { name: 'pricing' }, icon: DollarSign },
  { label: 'Settings', route: { name: 'settings' }, icon: Settings },
];

function isRouteActive(current: Route, item: Route): boolean {
  if (current.name !== item.name) return false;
  if (item.name === 'space' && current.name === 'space') return current.spaceId === item.spaceId;
  return true;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { route, navigate, profiles, currentUserId, notifications } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const me = profiles.find((p) => p.id === currentUserId);
  const unread = notifications.filter((n) => !n.read).length;

  const go = (r: Route) => {
    navigate(r);
    setMobileOpen(false);
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">ON</div>
        <div className="font-semibold text-ink-900 leading-tight">
          Opportunity<span className="text-brand-600">Network</span>
        </div>
      </div>
      <div className="px-3 mb-2">
        <button onClick={() => go({ name: 'create-opportunity' })} className="btn-primary w-full">
          <Plus className="w-4 h-4" />
          New Opportunity
        </button>
      </div>
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = isRouteActive(route, item.route);
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => go(item.route)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${active ? 'text-brand-600' : 'text-ink-400'}`} style={{ width: 18, height: 18 }} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.label === 'Notifications' && unread > 0 && (
                <span className="bg-brand-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{unread}</span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-ink-200">
        <button onClick={() => go({ name: 'profile' })} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-ink-100">
          <Avatar src={me?.photoUrl} name={me?.name ?? ''} size={32} />
          <div className="text-left min-w-0">
            <div className="text-sm font-medium text-ink-800 truncate">{me?.name}</div>
            <div className="text-xs text-ink-500 truncate">{me?.headline}</div>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-ink-200 flex-col z-30">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-ink-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs">ON</div>
          <span className="font-semibold text-ink-900 text-sm">Opportunity Network</span>
        </div>
        <button aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="min-w-11 min-h-11 -my-2 -mr-2 flex items-center justify-center text-ink-600">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-ink-900/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[80%] bg-white shadow-xl flex flex-col animate-fadein">
            <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute top-1 right-1 min-w-11 min-h-11 flex items-center justify-center text-ink-400 z-10">
              <X className="w-5 h-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="note">
            Preview build: sample people, reviews, verifications, partners, offers, and outcomes are demonstration data—not real claims.
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
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
