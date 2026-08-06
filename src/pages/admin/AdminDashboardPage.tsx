import { useState, useEffect } from 'react';
import {
  Users, Briefcase, Building2, Store, MessageSquare, ShieldCheck, AlertTriangle,
  TrendingUp, Activity, Clock, FileText, CheckCircle2,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminShell';
import { Card, Badge } from '@/components/ui';
import { fetchPlatformStats, fetchRecentActivity, type PlatformStats } from '@/lib/admin-queries';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activity, setActivity] = useState<{
    recentUsers: { id: string; name: string; created_at: string }[];
    recentVerifications: { id: string; type: string; label: string; state: string }[];
    recentReports: { id: string; type: string; severity: string; status: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.all([fetchPlatformStats(), fetchRecentActivity()]);
        setStats(s);
        setActivity(a);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div>
        <AdminPageHeader title="Admin Dashboard" subtitle="Platform overview and marketplace health" />
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-ink-500">Loading platform data…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <AdminPageHeader title="Admin Dashboard" subtitle="Platform overview and marketplace health" />
        <Card className="p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-ink-600">{error}</p>
          <p className="text-xs text-ink-400 mt-2">
            Note: some data requires admin privileges on your auth account. If you see an RLS error,
            ensure your user has the admin role in raw_app_metadata.
          </p>
        </Card>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, tone: 'brand' as const },
    { label: 'Active (30d)', value: stats?.activeUsers ?? 0, icon: TrendingUp, tone: 'accent' as const },
    { label: 'Opportunities', value: stats?.opportunities ?? 0, icon: Briefcase, tone: 'brand' as const },
    { label: 'Collaboration Spaces', value: stats?.collaborationSpaces ?? 0, icon: Activity, tone: 'accent' as const },
    { label: 'Professionals', value: stats?.professionals ?? 0, icon: Store, tone: 'brand' as const },
    { label: 'Companies', value: stats?.companies ?? 0, icon: Building2, tone: 'accent' as const },
    { label: 'Applications', value: stats?.applications ?? 0, icon: FileText, tone: 'brand' as const },
    { label: 'Messages', value: stats?.messages ?? 0, icon: MessageSquare, tone: 'accent' as const },
    { label: 'Pending Verifications', value: stats?.pendingVerifications ?? 0, icon: ShieldCheck, tone: 'amber' as const },
    { label: 'Pending Reports', value: stats?.pendingReports ?? 0, icon: AlertTriangle, tone: 'red' as const },
  ];

  return (
    <div>
      <AdminPageHeader title="Admin Dashboard" subtitle="Platform overview and marketplace health" />

      {/* Platform Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-ink-400" />
                <span className="text-xs font-medium text-ink-500">{s.label}</span>
              </div>
              <div className="text-2xl font-bold text-ink-900 tabular-nums">{s.value}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-5">
          <h2 className="section-title mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <ActivitySection
              title="New Users"
              items={activity?.recentUsers.map((u) => ({ id: u.id, label: u.name, sub: u.created_at })) ?? []}
              emptyText="No recent user registrations."
            />
            <ActivitySection
              title="Pending Verifications"
              items={activity?.recentVerifications.map((v) => ({ id: v.id, label: v.label, sub: v.type })) ?? []}
              emptyText="No pending verification requests."
            />
            <ActivitySection
              title="Open Reports"
              items={activity?.recentReports.map((r) => ({ id: r.id, label: r.type, sub: r.severity })) ?? []}
              emptyText="No open reports."
            />
          </div>
        </Card>

        {/* Marketplace Health */}
        <Card className="p-5">
          <h2 className="section-title mb-4">Marketplace Health</h2>
          <div className="space-y-3">
            <HealthBar label="Opportunity Growth" value={stats?.opportunities ?? 0} max={Math.max(stats?.opportunities ?? 1, 10)} />
            <HealthBar label="Professional Growth" value={stats?.professionals ?? 0} max={Math.max(stats?.professionals ?? 1, 10)} />
            <HealthBar label="Company Growth" value={stats?.companies ?? 0} max={Math.max(stats?.companies ?? 1, 10)} />
            <HealthBar label="Collaboration Activity" value={stats?.collaborationSpaces ?? 0} max={Math.max(stats?.collaborationSpaces ?? 1, 10)} />
          </div>
          <div className="mt-4 pt-4 border-t border-ink-100">
            <p className="text-xs text-ink-400">
              Growth charts will show trend data once historical snapshots are available.
              Current values reflect live counts.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ActivitySection({ title, items, emptyText }: { title: string; items: { id: string; label: string; sub: string }[]; emptyText: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-3.5 h-3.5 text-ink-400" />
        <span className="text-xs font-semibold text-ink-700 uppercase tracking-wide">{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-ink-400 pl-5">{emptyText}</p>
      ) : (
        <div className="space-y-1.5 pl-5">
          {items.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-700 truncate">{item.label}</span>
              <span className="text-xs text-ink-400 shrink-0 ml-2">{item.sub}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HealthBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-ink-600">{label}</span>
        <span className="text-sm font-medium text-ink-800 tabular-nums">{value}</span>
      </div>
      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
