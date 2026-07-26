import { useState, useEffect } from 'react';
import { ScrollText, Filter } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminShell';
import { Card, Badge, EmptyState } from '@/components/ui';
import { fetchAuditLog, type AdminAuditLogEntry } from '@/lib/admin-queries';

export function AdminAuditPage() {
  const [entries, setEntries] = useState<AdminAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAuditLog(200);
        setEntries(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load audit log');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filterAction.trim()
    ? entries.filter((e) => e.action.toLowerCase().includes(filterAction.trim().toLowerCase()))
    : entries;

  return (
    <div>
      <AdminPageHeader title="Audit Log" subtitle="Append-only record of every administrative action" />

      {error && (
        <Card className="p-4 mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 mt-1">Dismiss</button>
        </Card>
      )}

      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-ink-400" />
        <input
          className="input max-w-xs"
          placeholder="Filter by action (e.g. user.suspend)…"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Loading audit log…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ScrollText className="w-5 h-5" />} title="No audit entries" description="No administrative actions have been recorded." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Target</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden md:table-cell">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Admin</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden sm:table-cell">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((e) => (
                <tr key={e.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3">
                    <Badge tone="slate">{e.action}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-600">
                    <span className="text-xs">{e.target_type}</span>
                    <div className="text-xs text-ink-400 font-mono truncate max-w-[120px]">{e.target_id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 text-ink-500 hidden md:table-cell max-w-xs truncate">{e.reason || '—'}</td>
                  <td className="px-4 py-3 text-ink-500 font-mono text-xs">{e.admin_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3 text-ink-500 hidden sm:table-cell">{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <p className="text-xs text-ink-400 mt-4">
        The audit log is append-only. No administrative changes can be made without a permanent record.
        {filtered.length > 0 && ` Showing ${filtered.length} of ${entries.length} entries.`}
      </p>
    </div>
  );
}
