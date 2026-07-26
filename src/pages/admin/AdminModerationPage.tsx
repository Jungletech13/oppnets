import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, XCircle, ArrowUpCircle, FileText } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminShell';
import { Card, Badge, Modal, EmptyState } from '@/components/ui';
import {
  fetchFraudAlerts, resolveFraudAlert, dismissFraudAlert, escalateFraudAlert,
  type FraudAlertRow,
} from '@/lib/admin-queries';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'dismissed', label: 'Dismissed' },
  { key: 'escalated', label: 'Escalated' },
] as const;

export function AdminModerationPage() {
  const [alerts, setAlerts] = useState<FraudAlertRow[]>([]);
  const [tab, setTab] = useState<typeof TABS[number]['key']>('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FraudAlertRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, [tab]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const data = await fetchFraudAlerts(tab);
      setAlerts(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: 'resolve' | 'dismiss' | 'escalate') {
    if (!selected || !reason.trim()) return;
    setBusy(true);
    try {
      if (action === 'resolve') await resolveFraudAlert(selected.id, reason);
      else if (action === 'dismiss') await dismissFraudAlert(selected.id, reason);
      else await escalateFraudAlert(selected.id, reason);
      setSelected(null);
      setReason('');
      await loadAlerts();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Moderation Center" subtitle="Review fraud alerts, user reports, and suspicious activity" />

      {error && (
        <Card className="p-4 mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 mt-1">Dismiss</button>
        </Card>
      )}

      <div className="flex gap-1 mb-4 border-b border-ink-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Loading moderation queue…</div>
        ) : alerts.length === 0 ? (
          <EmptyState icon={<AlertTriangle className="w-5 h-5" />} title="No alerts" description={`No ${tab} moderation alerts.`} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Type</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Severity</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden sm:table-cell">Detected</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {alerts.map((a) => (
                <tr key={a.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-800">{a.type}</div>
                    <div className="text-xs text-ink-400 truncate max-w-xs">{a.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={a.severity === 'high' ? 'red' : a.severity === 'medium' ? 'amber' : 'neutral'}>
                      {a.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={a.status === 'open' ? 'red' : a.status === 'resolved' ? 'accent' : 'neutral'}>
                      {a.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-500 hidden sm:table-cell">
                    {a.detected_at ? new Date(a.detected_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setSelected(a); setReason(''); }} className="btn-ghost text-xs">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Review Alert">
        {selected && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-ink-900">{selected.type}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge tone={selected.severity === 'high' ? 'red' : 'amber'}>{selected.severity}</Badge>
                <Badge tone="neutral">{selected.status}</Badge>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-ink-700 mb-1">Description</div>
              <div className="text-sm text-ink-600 bg-ink-50 rounded-lg p-3">{selected.description || 'No description provided.'}</div>
            </div>
            <div className="pt-3 border-t border-ink-200">
              <label className="label">Reason for action</label>
              <input
                className="input mb-3"
                placeholder="Explain your decision (required)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleAction('resolve')} className="btn-primary" disabled={busy || !reason.trim()}>
                  <CheckCircle2 className="w-4 h-4" /> Resolve
                </button>
                <button onClick={() => handleAction('dismiss')} className="btn-secondary" disabled={busy || !reason.trim()}>
                  <XCircle className="w-4 h-4" /> Dismiss
                </button>
                <button onClick={() => handleAction('escalate')} className="btn bg-amber-600 text-white hover:bg-amber-700 px-4 py-2 text-sm" disabled={busy || !reason.trim()}>
                  <ArrowUpCircle className="w-4 h-4" /> Escalate
                </button>
              </div>
              <p className="text-xs text-ink-400 mt-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Your identity, reason, and timestamp are permanently recorded.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
