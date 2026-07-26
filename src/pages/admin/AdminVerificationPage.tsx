import { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminShell';
import { Card, Badge, Modal, EmptyState } from '@/components/ui';
import {
  fetchVerificationQueue, approveVerification, rejectVerification,
  type VerificationClaimRow,
} from '@/lib/admin-queries';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Approved' },
  { key: 'failed', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const;

export function AdminVerificationPage() {
  const [claims, setClaims] = useState<VerificationClaimRow[]>([]);
  const [tab, setTab] = useState<typeof TABS[number]['key']>('pending');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VerificationClaimRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClaims();
  }, [tab]);

  async function loadClaims() {
    setLoading(true);
    try {
      const data = await fetchVerificationQueue(tab === 'all' ? 'all' : tab);
      setClaims(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!selected || !reason.trim()) return;
    setBusy(true);
    try {
      await approveVerification(selected.id, reason);
      setSelected(null);
      setReason('');
      await loadClaims();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!selected || !reason.trim()) return;
    setBusy(true);
    try {
      await rejectVerification(selected.id, reason);
      setSelected(null);
      setReason('');
      await loadClaims();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Verification Center" subtitle="Review identity, professional, and company verification requests" />

      {error && (
        <Card className="p-4 mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 mt-1">Dismiss</button>
        </Card>
      )}

      <div className="flex gap-1 mb-4 border-b border-ink-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Loading verification queue…</div>
        ) : claims.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="w-5 h-5" />} title="Queue is empty" description={`No ${tab} verification claims.`} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Claim</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">State</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden sm:table-cell">Submitted</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {claims.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-800">{c.label}</div>
                    <div className="text-xs text-ink-400 truncate max-w-xs">{c.detail}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-600 hidden sm:table-cell">{c.type}</td>
                  <td className="px-4 py-3">
                    {c.state === 'verified' ? (
                      <Badge tone="accent"><CheckCircle2 className="w-3 h-3" />Verified</Badge>
                    ) : c.state === 'pending' ? (
                      <Badge tone="amber"><Clock className="w-3 h-3" />Pending</Badge>
                    ) : (
                      <Badge tone="red"><XCircle className="w-3 h-3" />Failed</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-500 hidden sm:table-cell">
                    {c.verified_at ? new Date(c.verified_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setSelected(c); setReason(''); }} className="btn-ghost text-xs">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Review Verification Claim">
        {selected && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-semibold text-ink-900">{selected.label}</div>
              <div className="text-xs text-ink-400 mt-0.5">Type: {selected.type}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-ink-700 mb-1">Evidence / Details</div>
              <div className="text-sm text-ink-600 bg-ink-50 rounded-lg p-3">{selected.detail || 'No additional details provided.'}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-ink-700 mb-1">Current State</div>
              <Badge tone={selected.state === 'verified' ? 'accent' : selected.state === 'pending' ? 'amber' : 'red'}>
                {selected.state}
              </Badge>
            </div>
            <div className="pt-3 border-t border-ink-200">
              <label className="label">Reason for decision</label>
              <input
                className="input mb-3"
                placeholder="Explain the decision (required)…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
              />
              <div className="flex gap-2">
                <button onClick={handleApprove} className="btn-primary" disabled={busy || !reason.trim()}>
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button onClick={handleReject} className="btn bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-sm" disabled={busy || !reason.trim()}>
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
              <p className="text-xs text-ink-400 mt-2 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                The decision and reason are permanently recorded in the audit log.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
