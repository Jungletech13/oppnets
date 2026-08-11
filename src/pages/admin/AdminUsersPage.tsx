import { useState, useEffect, useCallback } from 'react';
import { Search, ShieldAlert, ShieldCheck, RotateCcw, FileText, Users as UsersIcon } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminShell';
import { Card, Badge, Avatar, Modal, EmptyState } from '@/components/ui';
import {
  fetchAdminUsers, fetchUserDetail, suspendUser, restoreUser, addAdminNote,
  type AdminUserRow,
} from '@/lib/admin-queries';

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchUserDetail>> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers(search);
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function openDetail(user: AdminUserRow) {
    setSelectedUser(user);
    setDetailLoading(true);
    setDetail(null);
    try {
      const d = await fetchUserDetail(user.id);
      setDetail(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user detail');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleSuspend() {
    if (!selectedUser || !actionReason.trim()) return;
    setBusy(true);
    try {
      await suspendUser(selectedUser.id, actionReason);
      const d = await fetchUserDetail(selectedUser.id);
      setDetail(d);
      setActionReason('');
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!selectedUser || !actionReason.trim()) return;
    setBusy(true);
    try {
      await restoreUser(selectedUser.id, actionReason);
      const d = await fetchUserDetail(selectedUser.id);
      setDetail(d);
      setActionReason('');
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleAddNote() {
    if (!selectedUser || !noteText.trim()) return;
    setBusy(true);
    try {
      await addAdminNote('user', selectedUser.id, noteText);
      const d = await fetchUserDetail(selectedUser.id);
      setDetail(d);
      setNoteText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add note');
    } finally {
      setBusy(false);
    }
  }

  const isSuspended = detail?.profile?.community_standing === 'monitoring';

  return (
    <div>
      <AdminPageHeader title="User Management" subtitle="Search, review, and manage OppNets member accounts" />

      {error && (
        <Card className="p-4 mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 mt-1">Dismiss</button>
        </Card>
      )}

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or headline…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
          />
        </div>
        <button onClick={loadUsers} className="btn-primary">Search</button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Loading users…</div>
        ) : users.length === 0 ? (
          <EmptyState icon={<UsersIcon className="w-5 h-5" />} title="No users found" description="No profiles match your search." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden sm:table-cell">Location</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Standing</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden sm:table-cell">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.name} size={32} />
                      <div className="min-w-0">
                        <div className="font-medium text-ink-800 truncate">{u.name}</div>
                        <div className="text-xs text-ink-400 truncate">{u.headline}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-600 hidden sm:table-cell">{u.location || '—'}</td>
                  <td className="px-4 py-3">
                    {u.community_standing === 'positive' ? (
                      <Badge tone="accent"><ShieldCheck className="w-3 h-3" />Good</Badge>
                    ) : u.community_standing === 'monitoring' ? (
                      <Badge tone="red"><ShieldAlert className="w-3 h-3" />Suspended</Badge>
                    ) : (
                      <Badge tone="neutral">Neutral</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-500 hidden sm:table-cell">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openDetail(u)} className="btn-ghost text-xs">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* User Detail Modal */}
      <Modal open={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Detail" wide>
        {selectedUser && (
          <div>
            {detailLoading ? (
              <div className="py-8 text-center text-sm text-ink-500">Loading user details…</div>
            ) : detail ? (
              <div className="space-y-5">
                {/* Profile summary */}
                <div className="flex items-center gap-3">
                  <Avatar name={detail.profile?.name ?? selectedUser.name} size={48} />
                  <div>
                    <div className="font-semibold text-ink-900">{detail.profile?.name ?? selectedUser.name}</div>
                    <div className="text-sm text-ink-500">{detail.profile?.headline ?? 'No headline'}</div>
                    <div className="text-xs text-ink-400 mt-0.5">{detail.profile?.location ?? 'No location'}</div>
                  </div>
                  <div className="ml-auto">
                    {detail.profile?.community_standing === 'monitoring' ? (
                      <Badge tone="red"><ShieldAlert className="w-3 h-3" />Suspended</Badge>
                    ) : (
                      <Badge tone="accent"><ShieldCheck className="w-3 h-3" />Active</Badge>
                    )}
                  </div>
                </div>

                {/* Verifications */}
                <div>
                  <h4 className="text-sm font-semibold text-ink-700 mb-2">Verification Claims</h4>
                  {detail.verifications.length === 0 ? (
                    <p className="text-xs text-ink-400">No verification claims submitted.</p>
                  ) : (
                    <div className="space-y-1">
                      {detail.verifications.map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-sm bg-ink-50 rounded-lg px-3 py-1.5">
                          <span className="text-ink-700">{v.label} <span className="text-ink-400">({v.type})</span></span>
                          <Badge tone={v.state === 'verified' ? 'accent' : v.state === 'pending' ? 'amber' : 'red'}>
                            {v.state}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fraud Alerts */}
                <div>
                  <h4 className="text-sm font-semibold text-ink-700 mb-2">Reports & Fraud Alerts</h4>
                  {detail.fraudAlerts.length === 0 ? (
                    <p className="text-xs text-ink-400">No reports filed against this user.</p>
                  ) : (
                    <div className="space-y-1">
                      {detail.fraudAlerts.map((r) => (
                        <div key={r.id} className="text-sm bg-ink-50 rounded-lg px-3 py-1.5">
                          <span className="text-ink-700">{r.type}</span>
                          <Badge tone={r.severity === 'high' ? 'red' : 'amber'}>{r.severity}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admin Notes */}
                <div>
                  <h4 className="text-sm font-semibold text-ink-700 mb-2">Admin Notes</h4>
                  {detail.notes.length === 0 && <p className="text-xs text-ink-400 mb-2">No admin notes.</p>}
                  <div className="space-y-1 mb-2">
                    {detail.notes.map((n) => (
                      <div key={n.id} className="text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        <p className="text-ink-700">{n.note}</p>
                        <p className="text-xs text-ink-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="input flex-1"
                      placeholder="Add internal note…"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      disabled={busy}
                    />
                    <button onClick={handleAddNote} className="btn-secondary" disabled={busy || !noteText.trim()}>
                      Add Note
                    </button>
                  </div>
                </div>

                {/* Audit History */}
                <div>
                  <h4 className="text-sm font-semibold text-ink-700 mb-2">Admin Action History</h4>
                  {detail.auditLog.length === 0 ? (
                    <p className="text-xs text-ink-400">No admin actions taken on this user.</p>
                  ) : (
                    <div className="space-y-1">
                      {detail.auditLog.map((a) => (
                        <div key={a.id} className="text-sm bg-ink-50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                          <span className="text-ink-700">{a.action}</span>
                          <span className="text-xs text-ink-400">{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admin Actions */}
                <div className="pt-4 border-t border-ink-200">
                  <h4 className="text-sm font-semibold text-ink-700 mb-2">Administrative Actions</h4>
                  <input
                    className="input mb-2"
                    placeholder="Reason for action (required)…"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    disabled={busy}
                  />
                  <div className="flex gap-2">
                    {isSuspended ? (
                      <button onClick={handleRestore} className="btn-primary" disabled={busy || !actionReason.trim()}>
                        <RotateCcw className="w-4 h-4" /> Restore Account
                      </button>
                    ) : (
                      <button onClick={handleSuspend} className="btn bg-red-600 text-white hover:bg-red-700 px-4 py-2 text-sm" disabled={busy || !actionReason.trim()}>
                        <ShieldAlert className="w-4 h-4" /> Suspend Account
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-ink-400 mt-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Every action is recorded in the audit log with your identity, reason, and timestamp.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-red-500">Failed to load details.</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
