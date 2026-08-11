import { useApp } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, SectionHeader, Badge, Avatar, ProgressBar, StatusPill } from '@/components/ui';
import { OpportunityCard } from '@/components/OpportunityCard';
import { PersonCard, GroupCard } from '@/components/PeopleCards';
import {
  Bell, CheckCircle2, AlertTriangle, CalendarClock, LayoutDashboard,
  ArrowRight, Handshake, Clock, Zap, Calendar, Flag,
} from 'lucide-react';
import { getProfile } from '@/data';
import type { Task } from '@/types';

export function HomePage() {
  const { opportunities, groups, profiles, spaces, currentUserId, navigate, notifications } = useApp();

  const mySpaces = spaces.filter((s) => s.memberIds.includes(currentUserId));
  const recommendedOpps = opportunities.slice(0, 3);
  const recommendedPeople = profiles.filter((p) => p.id !== currentUserId).slice(0, 2);
  const recommendedGroups = groups.slice(0, 2);

  const now = new Date();
  const isOverdue = (d: string, status: string) =>
    new Date(d) < now && status !== 'Completed' && status !== 'Approved';

  const allTasks = mySpaces.flatMap((s) => s.tasks.map((t) => ({ task: t, space: s })));

  // Action items — prioritized
  const overdueTasks = allTasks.filter(({ task }) => isOverdue(task.dueDate, task.status));
  const blockedTasks = allTasks.filter(({ task }) => task.status === 'Blocked');
  const pendingReviews = allTasks.filter(({ task }) => task.reviewerId === currentUserId && task.status === 'Ready for review');
  const tasksDueSoon = allTasks
    .filter(({ task }) => {
      const date = new Date(task.dueDate);
      const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 14 && task.status !== 'Completed' && task.status !== 'Approved';
    })
    .slice(0, 5);

  // Upcoming milestones (next 30 days, not done)
  const upcomingMilestones = mySpaces
    .flatMap((s) => s.milestones.map((m) => ({ milestone: m, space: s })))
    .filter(({ milestone }) => {
      const date = new Date(milestone.dueDate);
      const diff = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= -30 && !milestone.done;
    })
    .sort((a, b) => a.milestone.dueDate.localeCompare(b.milestone.dueDate))
    .slice(0, 5);

  // Check-in reminders
  const checkInReminders = mySpaces.filter((s) => s.nextCheckIn).slice(0, 3);

  // Recent activity (informational, shown after actions)
  const recentActivity = mySpaces
    .flatMap((s) => s.activity.map((a) => ({ ...a, spaceName: s.name, spaceId: s.id })))
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 6);

  const unreadNotifs = notifications.filter((n) => !n.read).slice(0, 3);

  const hasActions = overdueTasks.length > 0 || blockedTasks.length > 0 || pendingReviews.length > 0 || tasksDueSoon.length > 0 || upcomingMilestones.length > 0 || checkInReminders.length > 0;

  return (
    <div>
      <PageHeader title="Home" subtitle="Your action center — what needs attention, before everything else." />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main column — Actions first, then info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Center */}
          {hasActions && (
            <section>
              <SectionHeader title="Needs your attention" subtitle="Action items are prioritized — clear these first." action={<Badge tone="red">{overdueTasks.length + blockedTasks.length + pendingReviews.length}</Badge>} />

              {/* Overdue tasks */}
              {overdueTasks.length > 0 && (
                <Card className="p-4 mb-3 border-l-4 border-l-red-400">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-semibold text-ink-900">Overdue tasks</h3>
                    <Badge tone="red">{overdueTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {overdueTasks.map(({ task, space }) => (
                      <button key={task.id} onClick={() => navigate({ name: 'space', spaceId: space.id })} className="w-full text-left flex items-start gap-3 group p-2 rounded-lg hover:bg-red-50/50">
                        <Clock className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-800 group-hover:text-red-700 truncate">{task.title}</p>
                          <p className="text-xs text-ink-500">{space.name} · Was due {task.dueDate}</p>
                          <div className="mt-1 sm:hidden"><StatusPill status={task.status} /></div>
                        </div>
                        <div className="hidden sm:block shrink-0"><StatusPill status={task.status} /></div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Blocked work */}
              {blockedTasks.length > 0 && (
                <Card className="p-4 mb-3 border-l-4 border-l-amber-400">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-ink-900">Blocked work</h3>
                    <Badge tone="amber">{blockedTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {blockedTasks.map(({ task, space }) => (
                      <button key={task.id} onClick={() => navigate({ name: 'space', spaceId: space.id })} className="w-full text-left flex items-start gap-3 group p-2 rounded-lg hover:bg-amber-50/50">
                        <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-800 group-hover:text-amber-700 truncate">{task.title}</p>
                          <p className="text-xs text-ink-500">{space.name} · Due {task.dueDate}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Pending approvals */}
              {pendingReviews.length > 0 && (
                <Card className="p-4 mb-3 border-l-4 border-l-brand-400">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-4 h-4 text-brand-500" />
                    <h3 className="text-sm font-semibold text-ink-900">Pending approvals</h3>
                    <Badge tone="brand">{pendingReviews.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {pendingReviews.map(({ task, space }) => (
                      <button key={task.id} onClick={() => navigate({ name: 'space', spaceId: space.id })} className="w-full text-left flex items-start gap-3 group p-2 rounded-lg hover:bg-brand-50/50">
                        <CheckCircle2 className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-800 group-hover:text-brand-700 truncate">{task.title}</p>
                          <p className="text-xs text-ink-500">{space.name} · Ready for your review</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Upcoming milestones */}
              {upcomingMilestones.length > 0 && (
                <Card className="p-4 mb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Flag className="w-4 h-4 text-accent-500" />
                    <h3 className="text-sm font-semibold text-ink-900">Upcoming milestones</h3>
                  </div>
                  <div className="space-y-2">
                    {upcomingMilestones.map(({ milestone, space }) => (
                      <button key={milestone.id} onClick={() => navigate({ name: 'space', spaceId: space.id })} className="w-full text-left flex items-start gap-3 group p-2 rounded-lg hover:bg-ink-50">
                        <Calendar className="w-4 h-4 text-accent-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-800 group-hover:text-brand-700 truncate">{milestone.title}</p>
                          <p className="text-xs text-ink-500">{space.name} · Due {milestone.dueDate}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {/* Tasks due soon */}
              {tasksDueSoon.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarClock className="w-4 h-4 text-ink-400" />
                    <h3 className="text-sm font-semibold text-ink-900">Due soon (next 14 days)</h3>
                  </div>
                  <div className="space-y-2">
                    {tasksDueSoon.map(({ task, space }) => (
                      <button key={task.id} onClick={() => navigate({ name: 'space', spaceId: space.id })} className="w-full text-left flex items-start gap-3 group p-2 rounded-lg hover:bg-ink-50">
                        <CalendarClock className="w-4 h-4 text-ink-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-800 group-hover:text-brand-700 truncate">{task.title}</p>
                          <p className="text-xs text-ink-500">{space.name} · Due {task.dueDate}</p>
                          <div className="mt-1"><StatusPill status={task.status} /></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}
            </section>
          )}

          {/* Check-ins due */}
          {checkInReminders.length > 0 && (
            <section>
              <SectionHeader title="Check-ins due" />
              <Card className="p-4 space-y-3">
                {checkInReminders.map((s) => (
                  <button key={s.id} onClick={() => navigate({ name: 'space', spaceId: s.id })} className="w-full text-left flex items-center gap-3 group">
                    <Handshake className="w-4 h-4 text-brand-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800 group-hover:text-brand-700 truncate">{s.name}</p>
                      <p className="text-xs text-ink-500">{s.checkInFrequency} · Next {s.nextCheckIn}</p>
                    </div>
                  </button>
                ))}
              </Card>
            </section>
          )}

          {/* Active collaboration spaces */}
          <section>
            <SectionHeader title="Active Collaboration Spaces" action={<button onClick={() => navigate({ name: 'space', spaceId: mySpaces[0]?.id ?? 'cs-flip' })} className="btn-ghost text-sm">Open <ArrowRight className="w-4 h-4" /></button>} />
            <div className="grid sm:grid-cols-2 gap-4">
              {mySpaces.map((s) => {
                const spaceProgress = computeSpaceProgress(s.tasks);
                return (
                  <Card key={s.id} hover onClick={() => navigate({ name: 'space', spaceId: s.id })} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <LayoutDashboard className="w-4 h-4 text-brand-600" />
                      <h3 className="font-semibold text-ink-900 text-sm truncate flex-1">{s.name}</h3>
                    </div>
                    <p className="text-xs text-ink-500 line-clamp-2 mb-3">{s.description}</p>
                    <ProgressBar value={spaceProgress} showLabel />
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex -space-x-1.5">
                        {s.memberIds.slice(0, 4).map((id) => { const p = getProfile(id); return p ? <Avatar key={id} src={p.photoUrl} name={p.name} size={22} /> : null; })}
                      </div>
                      <span className="text-xs text-ink-500">{s.tasks.length} tasks</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Recommended opportunities */}
          <section>
            <SectionHeader title="Recommended opportunities" subtitle="Based on your skills, history, and availability." action={<button onClick={() => navigate({ name: 'discover' })} className="btn-ghost text-sm">View all <ArrowRight className="w-4 h-4" /></button>} />
            <div className="grid sm:grid-cols-2 gap-4">
              {recommendedOpps.map((o) => <OpportunityCard key={o.id} opp={o} />)}
            </div>
          </section>

          {/* Recommended collaborators */}
          <section>
            <SectionHeader title="Recommended collaborators" subtitle="Individuals and proven groups, with reasons." action={<button onClick={() => navigate({ name: 'people' })} className="btn-ghost text-sm">View all <ArrowRight className="w-4 h-4" /></button>} />
            <div className="grid sm:grid-cols-2 gap-4">
              {recommendedPeople.map((p) => <PersonCard key={p.id} profile={p} />)}
              {recommendedGroups.map((g) => <GroupCard key={g.id} group={g} />)}
            </div>
          </section>

          {/* Recent activity (informational, last) */}
          <section>
            <SectionHeader title="Recent project activity" subtitle="What has been happening across your spaces." />
            <Card className="divide-y divide-ink-100">
              {recentActivity.map((a) => {
                const actor = a.actorId ? getProfile(a.actorId) : null;
                return (
                  <div key={a.id} className="flex items-center gap-3 p-3">
                    {actor ? <Avatar src={actor.photoUrl} name={actor.name} size={28} /> : <div className="w-7 h-7 rounded-full bg-ink-100" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ink-700"><span className="font-medium">{actor?.name?.split(' ')[0] ?? 'System'}</span> — {a.text}</p>
                      <p className="text-xs text-ink-400">{a.spaceName} · {a.at}</p>
                    </div>
                  </div>
                );
              })}
            </Card>
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Action summary */}
          <Card className="p-4">
            <SectionHeader title="Action summary" />
            <div className="grid grid-cols-2 gap-3">
              <ActionStat label="Overdue" value={overdueTasks.length} tone="red" icon={Clock} />
              <ActionStat label="Blocked" value={blockedTasks.length} tone="amber" icon={Zap} />
              <ActionStat label="Reviews" value={pendingReviews.length} tone="brand" icon={CheckCircle2} />
              <ActionStat label="Due soon" value={tasksDueSoon.length} tone="slate" icon={CalendarClock} />
            </div>
          </Card>

          {/* Notifications */}
          {unreadNotifs.length > 0 && (
            <section>
              <SectionHeader title="Notifications" action={<button onClick={() => navigate({ name: 'notifications' })} className="btn-ghost text-sm">All</button>} />
              <Card className="p-4 space-y-3">
                {unreadNotifs.map((n) => (
                  <button key={n.id} onClick={() => navigate({ name: 'notifications' })} className="w-full text-left flex items-start gap-3">
                    <Bell className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-ink-700">{n.text}</p>
                  </button>
                ))}
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionStat({ label, value, tone, icon: Icon }: { label: string; value: number; tone: 'red' | 'amber' | 'brand' | 'slate'; icon: typeof Clock }) {
  const cls = tone === 'red' ? 'text-red-600 bg-red-50' : tone === 'amber' ? 'text-amber-600 bg-amber-50' : tone === 'brand' ? 'text-brand-600 bg-brand-50' : 'text-ink-600 bg-ink-50';
  return (
    <div className={`rounded-lg p-3 ${cls}`}>
      <Icon className="w-4 h-4 mb-1" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}

export function computeSpaceProgress(tasks: Task[]): number {
  if (!tasks.length) return 0;
  const total = tasks.reduce((sum, t) => sum + t.checklist.length, 0);
  if (total === 0) return 0;
  const approved = tasks.reduce((sum, t) => sum + t.checklist.filter((c) => c.done && !c.submittedForReview).length, 0);
  return Math.round((approved / total) * 100);
}
