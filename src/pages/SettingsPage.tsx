import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, SectionHeader, Field, Badge } from '@/components/ui';
import { Bell, Shield, Globe, User, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

type NotifKey = 'reviews' | 'messages' | 'checkIns' | 'weekly';

export function SettingsPage() {
  const { currentUserId, profiles, updateProfile } = useApp();
  const { signOut } = useAuth();
  const me = profiles.find((p) => p.id === currentUserId)!;
  const [notif, setNotif] = useState<Record<NotifKey, boolean>>({ reviews: true, messages: true, checkIns: true, weekly: false });
  const [visibility, setVisibility] = useState('public');

  const toggle = (key: NotifKey) => setNotif((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Account, notifications, and privacy." />

      <div className="space-y-6">
        <Card className="p-5">
          <SectionHeader title="Profile visibility" />
          <div className="space-y-2">
            {[
              { v: 'public', label: 'Public — visible to anyone', icon: Globe },
              { v: 'network', label: 'Network only — visible to connected users', icon: User },
              { v: 'private', label: 'Private — visible only to you', icon: Shield },
            ].map((opt) => (
              <button key={opt.v} onClick={() => setVisibility(opt.v)} className={`w-full text-left p-3 rounded-lg border flex items-center gap-3 ${visibility === opt.v ? 'border-brand-500 bg-brand-50' : 'border-ink-200'}`}>
                <opt.icon className={`w-4 h-4 ${visibility === opt.v ? 'text-brand-600' : 'text-ink-400'}`} />
                <span className="text-sm text-ink-700">{opt.label}</span>
                {visibility === opt.v && <Badge tone="brand">Selected</Badge>}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Notifications" />
          <div className="space-y-3">
            {([
              { key: 'reviews', label: 'Review requests and approvals' },
              { key: 'messages', label: 'New messages' },
              { key: 'checkIns', label: 'Partnership check-in reminders' },
              { key: 'weekly', label: 'Weekly progress summary' },
            ] as { key: NotifKey; label: string }[]).map((n) => (
              <label key={n.key} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-ink-700">{n.label}</span>
                <button onClick={() => toggle(n.key)} className={`relative w-10 h-6 rounded-full transition-colors ${notif[n.key] ? 'bg-brand-600' : 'bg-ink-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${notif[n.key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </label>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Account" />
          <div className="space-y-3">
            <Field label="Name"><input className="input" defaultValue={me.name} /></Field>
            <Field label="Email"><input className="input" defaultValue="demo@opportunitynetwork.app" disabled /></Field>
            <button onClick={() => updateProfile({ ...me, name: me.name })} className="btn-primary">Save changes</button>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Session" />
          <button onClick={() => signOut()} className="btn-secondary text-red-600 border-red-200 hover:bg-red-50">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </Card>

        <Card className="p-5">
          <SectionHeader title="About this prototype" />
          <p className="text-sm text-ink-500">This MVP now persists authenticated profiles, opportunities, collaboration spaces, and task review workflows in Supabase. Messaging, notifications, file storage, trust verification, and some workspace tools remain simulated.</p>
        </Card>
      </div>
    </div>
  );
}
