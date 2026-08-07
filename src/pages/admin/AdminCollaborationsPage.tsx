import { useState, useEffect } from 'react';
import { FolderKanban, Users, CheckSquare, Flag, Activity as ActivityIcon, FileText, ShieldCheck, Ban } from 'lucide-react';
import { AdminPageHeader } from '@/components/AdminShell';
import { Card, Badge, Modal, EmptyState } from '@/components/ui';
import { fetchAdminSpaces, fetchSpaceOverview, type AdminSpaceRow } from '@/lib/admin-queries';
import { fetchVerifiedCollaborationsForSpace, adminGenerateVerifiedCollaborations, adminInvalidateVerifiedCollaboration } from '@/lib/trust-queries';
import type { VerifiedCollaboration } from '@/types';

export function AdminCollaborationsPage() {
  const [spaces, setSpaces] = useState<AdminSpaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminSpaceRow | null>(null);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchSpaceOverview>> | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedCollabs, setVerifiedCollabs] = useState<VerifiedCollaboration[]>([]);
  const [collabLoading, setCollabLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invalidatingId, setInvalidatingId] = useState<string | null>(null);
  const [invalidateReason, setInvalidateReason] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchAdminSpaces();
        setSpaces(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load collaboration spaces');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function openSpace(space: AdminSpaceRow) {
    setSelected(space);
    setOverviewLoading(true);
    setOverview(null);
    setVerifiedCollabs([]);
    setCollabLoading(true);
    try {
      const [o, vc] = await Promise.all([
        fetchSpaceOverview(space.id),
        fetchVerifiedCollaborationsForSpace(space.id),
      ]);
      setOverview(o);
      setVerifiedCollabs(vc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load space overview');
    } finally {
      setOverviewLoading(false);
      setCollabLoading(false);
    }
  }

  async function handleGenerate() {
    if (!selected) return;
    setGenerating(true);
    try {
      await adminGenerateVerifiedCollaborations(selected.id);
      const vc = await fetchVerifiedCollaborationsForSpace(selected.id);
      setVerifiedCollabs(vc);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate verified collaborations');
    } finally {
      setGenerating(false);
    }
  }

  async function handleInvalidate(id: string) {
    if (!invalidateReason.trim()) return;
    setInvalidatingId(id);
    try {
      await adminInvalidateVerifiedCollaboration(id, invalidateReason);
      const vc = await fetchVerifiedCollaborationsForSpace(selected!.id);
      setVerifiedCollabs(vc);
      setInvalidateReason('');
      setInvalidatingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to invalidate collaboration');
    } finally {
      setInvalidatingId(null);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Collaboration Oversight" subtitle="Investigate collaboration spaces, projects, and disputes" />

      {error && (
        <Card className="p-4 mb-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 mt-1">Dismiss</button>
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Loading collaboration spaces…</div>
        ) : spaces.length === 0 ? (
          <EmptyState icon={<FolderKanban className="w-5 h-5" />} title="No collaboration spaces" description="No collaboration spaces have been created yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50 border-b border-ink-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-ink-600">Space</th>
                <th className="text-left px-4 py-3 font-medium text-ink-600 hidden sm:table-cell">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {spaces.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink-800">{s.name}</div>
                    <div className="text-xs text-ink-400 truncate max-w-xs">{s.description}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-500 hidden sm:table-cell">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openSpace(s)} className="btn-ghost text-xs">Investigate</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Collaboration Space Overview" wide>
        {selected && (
          <div>
            {overviewLoading ? (
              <div className="py-8 text-center text-sm text-ink-500">Loading space overview…</div>
            ) : overview ? (
              <div className="space-y-5">
                <div>
                  <div className="font-semibold text-ink-900">{overview.space?.name ?? selected.name}</div>
                  <div className="text-sm text-ink-500 mt-0.5">{overview.space?.description ?? selected.description}</div>
                </div>

                {/* Members */}
                <div>
                  <h4 className="text-sm font-semibold text-ink-700 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-ink-400" /> Members ({overview.members.length})
                  </h4>
                  {overview.members.length === 0 ? (
                    <p className="text-xs text-ink-400">No members.</p>
                  ) : (
                    <div className="space-y-1">
                      {overview.members.map((m) => (
                        <div key={m.id} className="text-sm bg-ink-50 rounded-lg px-3 py-1.5">
                          <span className="text-ink-700">User {m.user_id.slice(0, 8)}…</span>
                          <Badge tone="neutral">{m.role}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tasks */}
                <div>
                  <h4 className="text-sm font-semibold text-ink-700 mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-ink-400" /> Tasks ({overview.tasks.length})
                  </h4>
                  {overview.tasks.length === 0 ? (
                    <p className="text-xs text-ink-400">No tasks.</p>
                  ) : (
                    <div className="space-y-1">
                      {overview.tasks.slice(0, 10).map((t) => (
                        <div key={t.id} className="text-sm bg-ink-50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                          <span className="text-ink-700 truncate">{t.title}</span>
                          <Badge tone="neutral">{t.status}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Milestones */}
                <div>
                  <h4 className="text-sm font-semibold text-ink-700 mb-2 flex items-center gap-1.5">
                    <Flag className="w-4 h-4 text-ink-400" /> Milestones ({overview.milestones.length})
                  </h4>
                  {overview.milestones.length === 0 ? (
                    <p className="text-xs text-ink-400">No milestones.</p>
                  ) : (
                    <div className="space-y-1">
                      {overview.milestones.map((m) => (
                        <div key={m.id} className="text-sm bg-ink-50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                          <span className="text-ink-700">{m.title}</span>
                          <Badge tone={m.done ? 'accent' : 'neutral'}>{m.done ? 'Done' : 'Pending'}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="text-sm font-semibold text-ink-700 mb-2 flex items-center gap-1.5">
                    <ActivityIcon className="w-4 h-4 text-ink-400" /> Recent Activity
                  </h4>
                  {overview.activity.length === 0 ? (
                    <p className="text-xs text-ink-400">No activity recorded.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {overview.activity.map((a) => (
                        <div key={a.id} className="text-sm bg-ink-50 rounded-lg px-3 py-1.5">
                          <span className="text-ink-700">{a.text}</span>
                          <span className="text-xs text-ink-400 ml-2">{a.at ? new Date(a.at).toLocaleDateString() : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verified Collaborations */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-ink-700 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-ink-400" /> Verified Collaborations ({verifiedCollabs.length})
                    </h4>
                    <button
                      onClick={handleGenerate}
                      disabled={generating}
                      className="btn-ghost text-xs"
                    >
                      {generating ? 'Generating…' : 'Generate'}
                    </button>
                  </div>
                  {collabLoading ? (
                    <p className="text-xs text-ink-400">Loading…</p>
                  ) : verifiedCollabs.length === 0 ? (
                    <p className="text-xs text-ink-400">No verified collaboration records. Click Generate to evaluate this space.</p>
                  ) : (
                    <div className="space-y-2">
                      {verifiedCollabs.map((vc) => (
                        <div key={vc.id} className="text-sm bg-ink-50 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge tone={vc.verification_status === 'verified' ? 'accent' : vc.verification_status === 'invalidated' ? 'red' : 'neutral'}>
                                {vc.verification_status.replace(/_/g, ' ')}
                              </Badge>
                              <span className="text-xs text-ink-500">
                                {vc.overlap_days ?? 0}d overlap · v{vc.calculation_version}
                              </span>
                            </div>
                            {vc.verification_status !== 'invalidated' && (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Reason"
                                  value={invalidatingId === vc.id ? invalidateReason : ''}
                                  onChange={(e) => { setInvalidatingId(vc.id); setInvalidateReason(e.target.value); }}
                                  className="text-xs border border-ink-200 rounded px-2 py-1 w-32"
                                />
                                <button
                                  onClick={() => handleInvalidate(vc.id)}
                                  disabled={invalidatingId === vc.id && !invalidateReason.trim()}
                                  className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                                >
                                  <Ban className="w-3 h-3" /> Invalidate
                                </button>
                              </div>
                            )}
                          </div>
                          {vc.verification_reason && (
                            <p className="text-xs text-ink-500 mt-1">{vc.verification_reason}</p>
                          )}
                          {vc.invalidation_reason && (
                            <p className="text-xs text-red-500 mt-1">Invalidated: {vc.invalidation_reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audit Log */}
                <div>
                  <h4 className="text-sm font-semibold text-ink-700 mb-2 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-ink-400" /> Admin Actions on This Space
                  </h4>
                  {overview.auditLog.length === 0 ? (
                    <p className="text-xs text-ink-400">No admin actions taken on this space.</p>
                  ) : (
                    <div className="space-y-1">
                      {overview.auditLog.map((a) => (
                        <div key={a.id} className="text-sm bg-ink-50 rounded-lg px-3 py-1.5 flex items-center justify-between">
                          <span className="text-ink-700">{a.action}</span>
                          <span className="text-xs text-ink-400">{new Date(a.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-ink-200">
                  <p className="text-xs text-ink-400">
                    Admins have read-only oversight of collaboration spaces. Admins cannot silently
                    edit collaboration history, tasks, or decisions — all admin actions are recorded
                    in the audit log.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-red-500">Failed to load overview.</div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
