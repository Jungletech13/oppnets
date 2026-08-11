import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, EmptyState } from '@/components/ui';
import { Bell, CheckCheck, CheckCircle2, Clock, MessageSquare, ListChecks, Handshake, UserPlus, ArrowRight, Zap } from 'lucide-react';
import type { NotificationKind } from '@/types';

const kindIcon: Record<NotificationKind, typeof Bell> = {
  review_requested: ListChecks, review_completed: CheckCircle2, task_assigned: UserPlus, task_due: Clock,
  message: MessageSquare, application: Bell, check_in: Handshake, mention: MessageSquare,
};

const actionableKinds: NotificationKind[] = ['review_requested', 'task_assigned', 'task_due', 'check_in', 'application'];

export function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead, navigate } = useApp();

  const actionable = notifications.filter((n) => actionableKinds.includes(n.kind));
  const informational = notifications.filter((n) => !actionableKinds.includes(n.kind));
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${unread} unread`} action={unread > 0 ? <button onClick={markAllNotificationsRead} className="btn-secondary"><CheckCheck className="w-4 h-4" /> Mark all read</button> : undefined} />

      {notifications.length === 0 ? (
        <EmptyState icon={<Bell className="w-5 h-5" />} title="No notifications" description="You are all caught up." />
      ) : (
        <div className="space-y-6">
          {/* Requires Action */}
          {actionable.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-ink-900">Requires Action</h2>
                <Badge tone="amber">{actionable.filter((n) => !n.read).length} unread</Badge>
              </div>
              <Card className="divide-y divide-ink-100">
                {actionable.map((n) => {
                  const Icon = kindIcon[n.kind] || Bell;
                  return (
                    <div key={n.id} className={`flex flex-col sm:flex-row sm:items-start gap-3 p-4 ${n.read ? '' : 'bg-amber-50/40'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.read ? 'bg-ink-100 text-ink-400' : 'bg-amber-100 text-amber-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.read ? 'text-ink-600' : 'text-ink-900 font-medium'}`}>{n.text}</p>
                        <p className="text-xs text-ink-400 mt-0.5">{new Date(n.at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <button onClick={() => { markNotificationRead(n.id); if (n.link) navigate(parseLink(n.link)); }} className="btn-secondary text-xs whitespace-nowrap">
                          Open <ArrowRight className="w-3 h-3" />
                        </button>
                        {!n.read && <button onClick={() => markNotificationRead(n.id)} className="btn-ghost text-xs">Dismiss</button>}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          )}

          {/* Informational */}
          {informational.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-ink-400" />
                <h2 className="text-sm font-semibold text-ink-900">Informational Updates</h2>
                <Badge tone="slate">{informational.filter((n) => !n.read).length} unread</Badge>
              </div>
              <Card className="divide-y divide-ink-100">
                {informational.map((n) => {
                  const Icon = kindIcon[n.kind] || Bell;
                  return (
                    <button key={n.id} onClick={() => markNotificationRead(n.id)} className={`w-full text-left flex items-start gap-3 p-4 ${n.read ? '' : 'bg-brand-50/50'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.read ? 'bg-ink-100 text-ink-400' : 'bg-brand-100 text-brand-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.read ? 'text-ink-600' : 'text-ink-900 font-medium'}`}>{n.text}</p>
                        <p className="text-xs text-ink-400 mt-0.5">{new Date(n.at).toLocaleDateString()}</p>
                      </div>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5" />}
                    </button>
                  );
                })}
              </Card>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function parseLink(link: string): import('@/store').Route {
  if (link.startsWith('space:')) return { name: 'space', spaceId: link.slice(6) };
  if (link.startsWith('opportunity:')) return { name: 'opportunity', opportunityId: link.slice(12) };
  if (link === 'messages') return { name: 'messages' };
  if (link === 'discover') return { name: 'discover' };
  return { name: 'home' };
}
