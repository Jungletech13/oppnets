import { useEffect, useState } from 'react';
import { Bell, CreditCard, LogOut, Shield } from 'lucide-react';
import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Badge, Card, Field, SectionHeader } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useMembership } from '@/lib/use-membership';
import { fetchMyUsageLimits, type UsageLimits } from '@/lib/subscription-queries';

function formatStorage(megabytes: number) {
  return megabytes >= 1024 ? `${megabytes / 1024} GB` : `${megabytes} MB`;
}

export function SettingsPage() {
  const { currentUserId, profiles, updateProfile, navigate } = useApp();
  const { user, signOut } = useAuth();
  const { plan, subscription, loading: membershipLoading, error: membershipError } = useMembership();
  const me = profiles.find((profile) => profile.id === currentUserId);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [usage, setUsage] = useState<UsageLimits | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);

  useEffect(() => {
    if (me) setName(me.name);
  }, [me]);

  useEffect(() => {
    let active = true;
    fetchMyUsageLimits()
      .then((result) => { if (active) setUsage(result); })
      .catch(() => { if (active) setUsageError('Usage details are temporarily unavailable.'); });
    return () => { active = false; };
  }, []);

  const saveAccount = async () => {
    if (!me || !name.trim()) {
      setSaveMessage({ tone: 'error', text: 'Enter your name before saving.' });
      return;
    }

    setSaving(true);
    setSaveMessage(null);
    try {
      await updateProfile({ ...me, name: name.trim() });
      setSaveMessage({ tone: 'success', text: 'Account name saved.' });
    } catch (error) {
      setSaveMessage({ tone: 'error', text: error instanceof Error ? error.message : 'Could not save your account name.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" subtitle="Account, membership, notifications, and privacy." />

      <div className="space-y-6">
        <Card className="p-5">
          <SectionHeader title="Membership & billing" />
          {membershipLoading ? (
            <p className="text-sm text-ink-500">Loading your membership...</p>
          ) : membershipError ? (
            <p className="text-sm text-red-600">{membershipError}</p>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink-900">{plan?.name ?? 'Builder Free'}</p>
                    <Badge tone="accent">{subscription?.status ?? 'free'}</Badge>
                  </div>
                  <p className="text-sm text-ink-500 mt-1">
                    {plan ? (plan.price_cents === 0 ? 'Free forever' : `$${(plan.price_cents / 100).toFixed(0)} per ${plan.billing_interval === 'yearly' ? 'year' : 'month'}`) : 'Core membership'}
                  </p>
                  {subscription?.expires_at && (
                    <p className="text-xs text-ink-400 mt-1">Current period ends {new Date(subscription.expires_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <button onClick={() => navigate({ name: 'pricing' })} className="btn-secondary">View plans</button>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionHeader title="Plan usage" />
          {usage ? (
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <UsageLine label="Active opportunities" value={`${usage.active_opportunities.used ?? 0} of ${usage.active_opportunities.limit}`} />
              <UsageLine label="AI suggestions this month" value={`${usage.ai_actions.used ?? 0} of ${usage.ai_actions.limit}`} />
              <UsageLine label="Collaboration spaces" value={`Up to ${usage.collaboration_spaces.limit}`} />
              <UsageLine label="Members per space" value={`Up to ${usage.team_members.limit}`} />
              <UsageLine label="Messages per day" value={`${usage.messages_per_day.limit}`} />
              <UsageLine label="Storage" value={formatStorage(usage.storage_mb.limit)} />
            </div>
          ) : (
            <p className="text-sm text-ink-500">{usageError ?? 'Loading usage limits...'}</p>
          )}
        </Card>

        <Card className="p-5">
          <SectionHeader title="Account" />
          <div className="space-y-3">
            <Field label="Name">
              <input className="input" value={name} onChange={(event) => setName(event.target.value)} disabled={!me || saving} />
            </Field>
            <Field label="Sign-in email">
              <input className="input" value={user?.email ?? ''} readOnly disabled />
            </Field>
            <div className="flex items-center gap-3">
              <button onClick={saveAccount} disabled={!me || saving || !name.trim()} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              {saveMessage && (
                <p role="status" className={`text-sm ${saveMessage.tone === 'success' ? 'text-green-700' : 'text-red-600'}`}>{saveMessage.text}</p>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Profile visibility" />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-700 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">Visibility controls are coming soon</p>
              <p className="text-sm text-amber-800 mt-1">Profiles currently use the platform's standard visibility. Private and network-only modes will appear here after database access rules enforce them.</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Notifications" />
          <div className="rounded-lg border border-ink-200 bg-ink-50 p-4 flex items-start gap-3">
            <Bell className="w-5 h-5 text-ink-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-ink-800">Notification preferences are coming soon</p>
              <p className="text-sm text-ink-600 mt-1">Your choices will be available after email and in-app delivery preferences are connected to your account.</p>
            </div>
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

function UsageLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-200 px-3 py-2">
      <span className="text-ink-600">{label}</span>
      <span className="font-medium text-ink-900">{value}</span>
    </div>
  );
}
