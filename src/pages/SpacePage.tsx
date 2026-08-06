import { useState } from 'react';
import { useApp, taskProgress, MODULE_CATALOG, MODULE_PRESETS } from '@/store';
import { PageHeader } from '@/components/AppShell';
import { Card, Badge, Avatar, ProgressBar, StatusPill, SectionHeader, Modal, Field, EmptyState, BetaNote } from '@/components/ui';
import {
  CheckCircle2, Circle, AlertTriangle, Clock, Plus, X, ListChecks, MessageSquare, Calendar, Milestone as MilestoneIcon,
  FileText, StickyNote, Users, Settings, Gavel, ClipboardList, Handshake, ChevronRight, ArrowLeft, ShieldCheck, GripVertical, Eye, EyeOff, Pin, PinOff, LayoutTemplate, Target, Flag,
} from 'lucide-react';
import { getProfile } from '@/data';
import type { CollaborationSpace, Task, ModuleKind, WorkspaceModule, Milestone, Decision, CheckIn, CheckInFrequency } from '@/types';

type Tab = 'dashboard' | 'tasks' | 'chat' | 'milestones' | 'decisions' | 'record' | 'notes' | 'files' | 'settings' | 'toolkit';

const MODULE_ICONS: Record<string, typeof ListChecks> = {
  team_chat: MessageSquare, tasks: ListChecks, calendar: Calendar, milestones: MilestoneIcon,
  files: FileText, notes: StickyNote, budget: ListChecks, contacts: Users, vendors: Users,
  customer_pipeline: ListChecks, property_tracker: ListChecks, equipment_tracker: ListChecks,
  investors: Users, hiring: Users, project_timeline: Calendar, decision_log: Gavel, collaboration_record: ClipboardList,
};

export function SpacePage({ spaceId }: { spaceId: string }) {
  const { spaces, navigate, currentUserId } = useApp();
  const space = spaces.find((s) => s.id === spaceId);
  const [tab, setTab] = useState<Tab>('dashboard');

  if (!space) return <EmptyState icon={<ListChecks className="w-5 h-5" />} title="Space not found" description="This Collaboration Space does not exist." />;

  const visibleModules = space.modules.filter((m) => m.visible).sort((a, b) => a.order - b.order);
  const moduleToTab: Partial<Record<ModuleKind, Tab>> = {
    team_chat: 'chat', tasks: 'tasks', milestones: 'milestones', decision_log: 'decisions',
    collaboration_record: 'record', notes: 'notes', files: 'files', project_timeline: 'dashboard',
  };

  const overallProgress = computeOverall(space.tasks);

  return (
    <div>
      <button onClick={() => navigate({ name: 'home' })} className="btn-ghost text-sm mb-2"><ArrowLeft className="w-4 h-4" /> Home</button>
      <PageHeader
        title={space.name}
        subtitle={space.description}
        action={<Badge tone="brand">{space.checkInFrequency} check-ins</Badge>}
      />

      {/* Mission banner */}
      {(space.mission || space.successDefinition) && (
        <Card className="p-5 mb-5 bg-gradient-to-br from-brand-50 to-accent-50 border-brand-200">
          {space.mission && (
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-semibold text-brand-600 uppercase tracking-wide">Mission</h3>
                <p className="text-sm text-ink-800 mt-1 leading-relaxed">{space.mission}</p>
              </div>
            </div>
          )}
          {space.successDefinition && (
            <div className="flex items-start gap-3 mt-3 pt-3 border-t border-brand-200/50">
              <Flag className="w-5 h-5 text-accent-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-semibold text-accent-600 uppercase tracking-wide">What success looks like</h3>
                <p className="text-sm text-ink-800 mt-1 leading-relaxed">{space.successDefinition}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Members bar */}
      <Card className="p-3 mb-5 flex items-center gap-3 overflow-x-auto">
        <span className="text-xs font-medium text-ink-500 shrink-0">Team:</span>
        <div className="flex items-center gap-2">
          {space.memberIds.map((id) => {
            const p = getProfile(id);
            if (!p) return null;
            return (
              <button key={id} onClick={() => navigate({ name: 'profile', profileId: id })} className="flex items-center gap-1.5 bg-ink-50 rounded-full pl-1 pr-2.5 py-1 hover:bg-ink-100">
                <Avatar src={p.photoUrl} name={p.name} size={22} />
                <span className="text-xs font-medium text-ink-700">{p.name.split(' ')[0]}</span>
                <span className="text-xs text-ink-400">· {space.roles[id]}</span>
              </button>
            );
          })}
        </div>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar — modules */}
        <aside className="lg:col-span-1">
          <Card className="p-2 sticky top-20">
            <nav className="space-y-0.5">
              <ModuleLink label="Dashboard" icon={LayoutTemplate} active={tab === 'dashboard'} onClick={() => setTab('dashboard')} />
              {visibleModules.map((m) => {
                const Icon = MODULE_ICONS[m.kind] || ListChecks;
                const t = moduleToTab[m.kind];
                if (!t) return null;
                return <ModuleLink key={m.kind} label={m.label} icon={Icon} active={tab === t} onClick={() => setTab(t)} pinned={m.pinned} />;
              })}
              <ModuleLink label="Toolkit" icon={ClipboardList} active={tab === 'toolkit'} onClick={() => setTab('toolkit')} />
              <ModuleLink label="Settings" icon={Settings} active={tab === 'settings'} onClick={() => setTab('settings')} />
            </nav>
          </Card>
        </aside>

        {/* Main content */}
        <div className="lg:col-span-3">
          {tab === 'dashboard' && <DashboardTab space={space} overallProgress={overallProgress} setTab={setTab} />}
          {tab === 'tasks' && <TasksTab space={space} />}
          {tab === 'chat' && <ChatTab space={space} />}
          {tab === 'milestones' && <MilestonesTab space={space} />}
          {tab === 'decisions' && <DecisionsTab space={space} />}
          {tab === 'record' && <RecordTab space={space} />}
          {tab === 'notes' && <NotesTab space={space} />}
          {tab === 'files' && <FilesTab space={space} />}
          {tab === 'settings' && <SettingsTab space={space} />}
          {tab === 'toolkit' && <ToolkitTab space={space} />}
        </div>
      </div>
    </div>
  );
}

function ModuleLink({ label, icon: Icon, active, onClick, pinned }: { label: string; icon: typeof ListChecks; active: boolean; onClick: () => void; pinned?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100'}`}>
      <Icon className={`w-4 h-4 ${active ? 'text-brand-600' : 'text-ink-400'}`} />
      <span className="flex-1 text-left truncate">{label}</span>
      {pinned && <Pin className="w-3 h-3 text-brand-400" />}
    </button>
  );
}

// ===== Dashboard =====
function DashboardTab({ space, overallProgress, setTab }: { space: CollaborationSpace; overallProgress: number; setTab: (t: Tab) => void }) {
  const { currentUserId } = useApp();
  const myTasks = space.tasks.filter((t) => t.ownerId === currentUserId || t.reviewerId === currentUserId);
  const blocked = space.tasks.filter((t) => t.status === 'Blocked');
  const overdue = space.tasks.filter((t) => new Date(t.dueDate) < new Date() && t.status !== 'Completed' && t.status !== 'Approved');
  const pendingReview = space.tasks.filter((t) => t.status === 'Ready for review');
  const milestonesDone = space.milestones.filter((m) => m.done).length;

  const workload = space.memberIds.map((id) => {
    const tasks = space.tasks.filter((t) => t.ownerId === id);
    const active = tasks.filter((t) => t.status !== 'Completed' && t.status !== 'Approved').length;
    return { id, active, total: tasks.length };
  });

  return (
    <div className="space-y-6">
      {/* Progress overview */}
      <Card className="p-5">
        <SectionHeader title="Overall project progress" subtitle="Calculated from approved checklist items only." />
        <ProgressBar value={overallProgress} showLabel />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <Stat label="Tasks" value={space.tasks.length} />
          <Stat label="Milestones" value={`${milestonesDone}/${space.milestones.length}`} />
          <Stat label="Blocked" value={blocked.length} tone="red" />
          <Stat label="Overdue" value={overdue.length} tone="amber" />
        </div>
      </Card>

      {/* Alerts */}
      {(blocked.length > 0 || overdue.length > 0 || pendingReview.length > 0) && (
        <Card className="p-4 space-y-2">
          {pendingReview.length > 0 && <AlertRow icon={Clock} tone="amber" text={`${pendingReview.length} task(s) ready for review`} onClick={() => setTab('tasks')} />}
          {blocked.length > 0 && <AlertRow icon={AlertTriangle} tone="red" text={`${blocked.length} task(s) blocked`} onClick={() => setTab('tasks')} />}
          {overdue.length > 0 && <AlertRow icon={AlertTriangle} tone="red" text={`${overdue.length} task(s) overdue`} onClick={() => setTab('tasks')} />}
        </Card>
      )}

      {/* Team workload */}
      <Card className="p-5">
        <SectionHeader title="Team workload" />
        <div className="space-y-3">
          {workload.map((w) => {
            const p = getProfile(w.id);
            if (!p) return null;
            return (
              <div key={w.id} className="flex items-center gap-3">
                <Avatar src={p.photoUrl} name={p.name} size={32} />
                <span className="text-sm font-medium text-ink-800 w-24 truncate">{p.name.split(' ')[0]}</span>
                <div className="flex-1"><ProgressBar value={w.total ? (w.active / w.total) * 100 : 0} /></div>
                <span className="text-xs text-ink-500 w-16 text-right">{w.active} active</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* My tasks */}
      <Card className="p-5">
        <SectionHeader title="My tasks" action={<button onClick={() => setTab('tasks')} className="btn-ghost text-sm">All tasks <ChevronRight className="w-4 h-4" /></button>} />
        {myTasks.length === 0 ? <p className="text-sm text-ink-500">No tasks assigned to you.</p> : (
          <div className="space-y-2">
            {myTasks.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} space={space} compact />)}
          </div>
        )}
      </Card>

      {/* Recent activity */}
      <Card className="p-5">
        <SectionHeader title="Activity timeline" />
        <div className="space-y-2">
          {space.activity.slice(0, 8).map((a) => {
            const actor = a.actorId ? getProfile(a.actorId) : null;
            return (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                {actor ? <Avatar src={actor.photoUrl} name={actor.name} size={24} /> : <div className="w-6 h-6 rounded-full bg-ink-100" />}
                <span className="text-ink-700"><span className="font-medium">{actor?.name?.split(' ')[0] ?? 'System'}</span> {a.text}</span>
                <span className="text-xs text-ink-400 ml-auto">{a.at}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: 'red' | 'amber' }) {
  const cls = tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-ink-900';
  return (
    <div className="bg-ink-50 rounded-lg p-3">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-xs text-ink-500">{label}</div>
    </div>
  );
}

function AlertRow({ icon: Icon, tone, text, onClick }: { icon: typeof AlertTriangle; tone: 'red' | 'amber'; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 text-sm">
      <Icon className={`w-4 h-4 ${tone === 'red' ? 'text-red-500' : 'text-amber-500'}`} />
      <span className="text-ink-700">{text}</span>
      <ChevronRight className="w-4 h-4 ml-auto text-ink-400" />
    </button>
  );
}

// ===== Tasks =====
function TasksTab({ space }: { space: CollaborationSpace }) {
  const { addTask } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const currentTask = selectedTask ? space.tasks.find((t) => t.id === selectedTask.id) : null;

  if (currentTask) return <TaskDetail task={currentTask} space={space} onBack={() => setSelectedTask(null)} />;

  const byStatus = (statuses: string[]) => space.tasks.filter((t) => statuses.includes(t.status));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeader title="Tasks" subtitle="Progress is calculated from approved checklist items." />
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> New task</button>
      </div>

      {space.tasks.length === 0 ? (
        <EmptyState icon={<ListChecks className="w-5 h-5" />} title="No tasks yet" description="Create your first task to start tracking progress." action={<button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> New task</button>} />
      ) : (
        <div className="space-y-5">
          <TaskGroup label="Ready for review" tasks={byStatus(['Ready for review'])} space={space} onSelect={setSelectedTask} />
          <TaskGroup label="In progress" tasks={byStatus(['In progress', 'Not started'])} space={space} onSelect={setSelectedTask} />
          <TaskGroup label="Needs attention" tasks={byStatus(['Blocked', 'Changes requested', 'Needs discussion'])} space={space} onSelect={setSelectedTask} />
          <TaskGroup label="Approved & completed" tasks={byStatus(['Approved', 'Completed'])} space={space} onSelect={setSelectedTask} />
        </div>
      )}

      <NewTaskModal open={showNew} onClose={() => setShowNew(false)} space={space} onCreate={(t) => { addTask(space.id, t); setShowNew(false); }} />
    </div>
  );
}

function TaskGroup({ label, tasks, space, onSelect }: { label: string; tasks: Task[]; space: CollaborationSpace; onSelect: (t: Task) => void }) {
  if (tasks.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-ink-700 mb-2">{label} <span className="text-ink-400">({tasks.length})</span></h3>
      <div className="space-y-2">
        {tasks.map((t) => <TaskRow key={t.id} task={t} space={space} onClick={() => onSelect(t)} />)}
      </div>
    </div>
  );
}

function TaskRow({ task, space, onClick, compact }: { task: Task; space: CollaborationSpace; onClick?: () => void; compact?: boolean }) {
  const { done, total, approvedPct } = taskProgress(task);
  const owner = getProfile(task.ownerId);
  const overdue = new Date(task.dueDate) < new Date() && task.status !== 'Completed' && task.status !== 'Approved';

  return (
    <div onClick={onClick} className={`card p-3 ${onClick ? 'hover:shadow-cardHover cursor-pointer' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-ink-900 text-sm">{task.title}</h4>
            <StatusPill status={task.status} />
            {overdue && <Badge tone="red">Overdue</Badge>}
          </div>
          {!compact && <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{task.description}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-500">
            {owner && <span className="inline-flex items-center gap-1"><Avatar src={owner.photoUrl} name={owner.name} size={16} />{owner.name.split(' ')[0]}</span>}
            <span>Due {task.dueDate}</span>
            <span>{done}/{total} checklist</span>
          </div>
        </div>
        <div className="w-20 shrink-0">
          <ProgressBar value={approvedPct} showLabel />
        </div>
      </div>
    </div>
  );
}

// ===== Task detail with review workflow =====
function TaskDetail({ task, space, onBack }: { task: Task; space: CollaborationSpace; onBack: () => void }) {
  const { currentUserId, toggleChecklistItem, toggleChecklistReview, submitForReview, reviewTask, updateTask } = useApp();
  const [showFeedback, setShowFeedback] = useState(false);
  const [comment, setComment] = useState('');

  const isOwner = task.ownerId === currentUserId;
  const isReviewer = task.reviewerId === currentUserId;
  const { done, total, pct, approvedPct } = taskProgress(task);
  const owner = getProfile(task.ownerId);
  const reviewer = getProfile(task.reviewerId);

  const canSubmit = task.status === 'In progress' || task.status === 'Not started' || task.status === 'Changes requested' || task.status === 'Needs discussion';

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="btn-ghost text-sm"><ArrowLeft className="w-4 h-4" /> All tasks</button>

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-ink-900">{task.title}</h2>
            <p className="text-sm text-ink-600 mt-1">{task.description}</p>
          </div>
          <StatusPill status={task.status} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div><p className="text-xs text-ink-400">Owner</p><p className="font-medium text-ink-800">{owner?.name}</p></div>
          <div><p className="text-xs text-ink-400">Reviewer</p><p className="font-medium text-ink-800">{reviewer?.name}</p></div>
          <div><p className="text-xs text-ink-400">Due</p><p className="font-medium text-ink-800">{task.dueDate}</p></div>
          <div><p className="text-xs text-ink-400">Priority</p><p className="font-medium text-ink-800">{task.priority}</p></div>
        </div>
      </Card>

      {/* Progress */}
      <Card className="p-5">
        <SectionHeader title="Progress" subtitle="Approved progress only counts items not pending review." />
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1"><span className="text-ink-600">Checklist completion</span><span className="text-ink-800 font-medium">{done}/{total} ({pct}%)</span></div>
            <ProgressBar value={pct} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span className="text-ink-600">Approved progress</span><span className="text-ink-800 font-medium">{approvedPct}%</span></div>
            <ProgressBar value={approvedPct} />
          </div>
        </div>
      </Card>

      {/* Checklist */}
      <Card className="p-5">
        <SectionHeader title="Checklist" subtitle="Check items done, then submit for review. Submitted items are marked." />
        <div className="space-y-2">
          {task.checklist.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50">
              <button onClick={() => (isOwner || isReviewer) && toggleChecklistItem(space.id, task.id, c.id)} disabled={!isOwner && !isReviewer}>
                {c.done ? <CheckCircle2 className="w-5 h-5 text-accent-500" /> : <Circle className="w-5 h-5 text-ink-300" />}
              </button>
              <span className={`text-sm flex-1 ${c.done ? 'text-ink-800 line-through' : 'text-ink-700'}`}>{c.text}</span>
              {c.submittedForReview && <Badge tone="amber">In review</Badge>}
              {c.done && isOwner && (
                <button onClick={() => toggleChecklistReview(space.id, task.id, c.id)} className="text-xs text-brand-600 hover:underline">
                  {c.submittedForReview ? 'Unsubmit' : 'Submit'}
                </button>
              )}
            </div>
          ))}
        </div>
        {isOwner && canSubmit && (
          <button onClick={() => submitForReview(space.id, task.id)} className="btn-primary mt-4">
            <ShieldCheck className="w-4 h-4" /> Submit for review
          </button>
        )}
      </Card>

      {/* Review actions */}
      {isReviewer && task.status === 'Ready for review' && (
        <Card className="p-5">
          <SectionHeader title="Review" subtitle="You are the reviewer. Choose an action." />
          {!showFeedback ? (
            <div className="flex flex-wrap gap-2">
              <button onClick={() => reviewTask(space.id, task.id, 'approve')} className="btn bg-accent-600 text-white hover:bg-accent-700 px-4 py-2 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => setShowFeedback(true)} className="btn bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-4 py-2 text-sm">
                <AlertTriangle className="w-4 h-4" /> Request changes
              </button>
              <button onClick={() => reviewTask(space.id, task.id, 'discussion')} className="btn bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 px-4 py-2 text-sm">
                <MessageSquare className="w-4 h-4" /> Needs discussion
              </button>
            </div>
          ) : (
            <FeedbackForm onSubmit={(fb) => { reviewTask(space.id, task.id, 'changes', fb); setShowFeedback(false); }} onCancel={() => setShowFeedback(false)} />
          )}
        </Card>
      )}

      {/* Existing feedback */}
      {task.feedback && (
        <Card className="p-5">
          <SectionHeader title="Feedback" />
          <div className="space-y-2 text-sm">
            <div><span className="text-ink-500">What needs to change:</span> <span className="text-ink-800">{task.feedback.whatNeedsToChange}</span></div>
            <div><span className="text-ink-500">Why:</span> <span className="text-ink-800">{task.feedback.whyItNeedsToChange}</span></div>
            <div><span className="text-ink-500">Required:</span> <Badge tone={task.feedback.required ? 'red' : 'neutral'}>{task.feedback.required ? 'Required' : 'Optional'}</Badge></div>
            {task.feedback.comments && <div><span className="text-ink-500">Comments:</span> <span className="text-ink-800">{task.feedback.comments}</span></div>}
          </div>
          {isOwner && <button onClick={() => updateTask(space.id, task.id, (t) => ({ ...t, status: 'In progress' }))} className="btn-primary mt-4">Revise & resubmit</button>}
        </Card>
      )}

      {/* Revision history */}
      <Card className="p-5">
        <SectionHeader title="Revision history" />
        <div className="space-y-2">
          {task.revisions.map((r, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-7 h-7 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold">{r.version}</div>
              <span className="text-ink-700">{r.note}</span>
              <StatusPill status={r.status} />
              <span className="text-xs text-ink-400 ml-auto">{r.at}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Comments */}
      <Card className="p-5">
        <SectionHeader title="Comments" />
        <div className="space-y-3 mb-3">
          {task.comments.map((c) => {
            const author = getProfile(c.authorId);
            return (
              <div key={c.id} className="flex items-start gap-2">
                {author && <Avatar src={author.photoUrl} name={author.name} size={28} />}
                <div>
                  <p className="text-sm text-ink-800"><span className="font-medium">{author?.name}</span> <span className="text-xs text-ink-400">{c.at}</span></p>
                  <p className="text-sm text-ink-600">{c.text}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Add a comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <button onClick={() => { if (comment) { updateTask(space.id, task.id, (t) => ({ ...t, comments: [...t.comments, { id: `cm-${Date.now()}`, authorId: currentUserId, text: comment, at: new Date().toISOString().slice(0, 10) }] })); setComment(''); } }} className="btn-primary">Send</button>
        </div>
      </Card>
    </div>
  );
}

function FeedbackForm({ onSubmit, onCancel }: { onSubmit: (fb: { reviewerId: string; whatNeedsToChange: string; whyItNeedsToChange: string; required: boolean; comments: string }) => void; onCancel: () => void }) {
  const { currentUserId } = useApp();
  const [what, setWhat] = useState('');
  const [why, setWhy] = useState('');
  const [required, setRequired] = useState(true);
  const [comments, setComments] = useState('');
  return (
    <div className="space-y-3">
      <Field label="What needs to change"><textarea className="input min-h-[60px]" value={what} onChange={(e) => setWhat(e.target.value)} /></Field>
      <Field label="Why it needs to change"><textarea className="input min-h-[60px]" value={why} onChange={(e) => setWhy(e.target.value)} /></Field>
      <div>
        <label className="label">Required or optional</label>
        <div className="flex gap-2">
          <button onClick={() => setRequired(true)} className={`btn px-4 py-2 text-sm ${required ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white text-ink-600 border border-ink-200'}`}>Required</button>
          <button onClick={() => setRequired(false)} className={`btn px-4 py-2 text-sm ${!required ? 'bg-ink-100 text-ink-700 border border-ink-300' : 'bg-white text-ink-600 border border-ink-200'}`}>Optional</button>
        </div>
      </div>
      <Field label="Additional comments"><textarea className="input" value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={() => what && onSubmit({ reviewerId: currentUserId, whatNeedsToChange: what, whyItNeedsToChange: why, required, comments })} className="btn-primary" disabled={!what}>Submit feedback</button>
      </div>
    </div>
  );
}

function NewTaskModal({ open, onClose, space, onCreate }: { open: boolean; onClose: () => void; space: CollaborationSpace; onCreate: (t: Task) => void }) {
  const { currentUserId } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState(currentUserId);
  const [reviewerId, setReviewerId] = useState(space.memberIds.find((id) => id !== currentUserId) ?? currentUserId);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [checklist, setChecklist] = useState<string[]>(['']);

  const create = () => {
    const task: Task = {
      id: `t-${Date.now()}`, title, description, ownerId, reviewerId,
      dueDate: dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      priority, status: 'Not started',
      checklist: checklist.filter(Boolean).map((t, i) => ({ id: `c-${Date.now()}-${i}`, text: t, done: false })),
      dependencies: [], comments: [], revisions: [],
    };
    onCreate(task);
    setTitle(''); setDescription(''); setChecklist(['']);
  };

  return (
    <Modal open={open} onClose={onClose} title="New task" wide>
      <div className="space-y-3">
        <Field label="Task title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Description"><textarea className="input min-h-[60px]" value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Owner"><select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>{space.memberIds.map((id) => { const p = getProfile(id); return p ? <option key={id} value={id}>{p.name}</option> : null; })}</select></Field>
          <Field label="Reviewer"><select className="input" value={reviewerId} onChange={(e) => setReviewerId(e.target.value)}>{space.memberIds.map((id) => { const p = getProfile(id); return p ? <option key={id} value={id}>{p.name}</option> : null; })}</select></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Due date"><input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Priority"><select className="input" value={priority} onChange={(e) => setPriority(e.target.value as 'Low' | 'Medium' | 'High')}><option>Low</option><option>Medium</option><option>High</option></select></Field>
        </div>
        <Field label="Checklist items">
          <div className="space-y-2">
            {checklist.map((c, i) => (
              <div key={i} className="flex gap-2">
                <input className="input flex-1" placeholder="Checklist item" value={c} onChange={(e) => { const next = [...checklist]; next[i] = e.target.value; setChecklist(next); }} />
                {checklist.length > 1 && <button onClick={() => setChecklist(checklist.filter((_, j) => j !== i))} className="btn-ghost"><X className="w-4 h-4" /></button>}
              </div>
            ))}
            <button onClick={() => setChecklist([...checklist, ''])} className="btn-ghost text-sm"><Plus className="w-4 h-4" /> Add item</button>
          </div>
        </Field>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={create} className="btn-primary" disabled={!title}>Create task</button>
        </div>
      </div>
    </Modal>
  );
}

// ===== Chat =====
function ChatTab({ space }: { space: CollaborationSpace }) {
  const { conversations, sendMessage, startConversation, currentUserId } = useApp();
  const conv = conversations.find((c) => c.spaceId === space.id);
  const [text, setText] = useState('');
  const convId = conv?.id ?? '';

  return (
    <div className="space-y-3">
      <SectionHeader title="Team Chat" subtitle="Conversation for this Collaboration Space." />
      <Card className="p-4 flex flex-col" style={{ minHeight: 300 }}>
        <div className="flex-1 space-y-3 overflow-y-auto mb-3" style={{ maxHeight: 400 }}>
          {(!conv || conv.messages.length === 0) && <p className="text-sm text-ink-500 text-center py-8">No messages yet. Start the conversation.</p>}
          {conv?.messages.map((m) => {
            const author = getProfile(m.authorId);
            const isMe = m.authorId === currentUserId;
            return (
              <div key={m.id} className={`flex items-start gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                {author && <Avatar src={author.photoUrl} name={author.name} size={28} />}
                <div className={`max-w-[70%] ${isMe ? 'text-right' : ''}`}>
                  <p className="text-xs text-ink-400 mb-0.5">{author?.name?.split(' ')[0]} · {new Date(m.at).toLocaleDateString()}</p>
                  <div className={`inline-block rounded-lg px-3 py-2 text-sm ${isMe ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-800'}`}>{m.text}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Type a message..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text) { if (!conv) { startConversation(space.memberIds, `${space.name} — Team`, 'space', space.id); } sendMessage(convId, text); setText(''); } }} />
          <button onClick={() => { if (text) { if (!conv) { startConversation(space.memberIds, `${space.name} — Team`, 'space', space.id); } sendMessage(convId, text); setText(''); } }} className="btn-primary">Send</button>
        </div>
      </Card>
    </div>
  );
}

// ===== Milestones =====
function MilestonesTab({ space }: { space: CollaborationSpace }) {
  const { addMilestone, toggleMilestone } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  const done = space.milestones.filter((m) => m.done).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="Milestones" subtitle={`${done}/${space.milestones.length} complete`} />
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add milestone</button>
      </div>
      {space.milestones.length === 0 ? <EmptyState icon={<MilestoneIcon className="w-5 h-5" />} title="No milestones" description="Add milestones to track key moments." /> : (
        <div className="space-y-2">
          {space.milestones.map((m) => (
            <Card key={m.id} className="p-3 flex items-center gap-3">
              <button onClick={() => toggleMilestone(space.id, m.id)}>{m.done ? <CheckCircle2 className="w-5 h-5 text-accent-500" /> : <Circle className="w-5 h-5 text-ink-300" />}</button>
              <div className="flex-1">
                <p className={`text-sm font-medium ${m.done ? 'text-ink-400 line-through' : 'text-ink-900'}`}>{m.title}</p>
                <p className="text-xs text-ink-500">Due {m.dueDate}</p>
              </div>
              {m.done && <Badge tone="accent">Done</Badge>}
            </Card>
          ))}
        </div>
      )}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Add milestone">
        <div className="space-y-3">
          <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Due date"><input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <div className="flex justify-end gap-2"><button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button><button onClick={() => { if (title) { addMilestone(space.id, { id: `m-${Date.now()}`, title, dueDate: dueDate || new Date().toISOString().slice(0, 10), done: false }); setShowNew(false); setTitle(''); } }} className="btn-primary">Add</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ===== Decisions =====
function DecisionsTab({ space }: { space: CollaborationSpace }) {
  const { addDecision, currentUserId } = useApp();
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [rationale, setRationale] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="Decision Log" subtitle="Major decisions and their rationale." />
        <button onClick={() => setShowNew(true)} className="btn-primary"><Plus className="w-4 h-4" /> Log decision</button>
      </div>
      {space.decisions.length === 0 ? <EmptyState icon={<Gavel className="w-5 h-5" />} title="No decisions logged" description="Log major decisions for the team." /> : (
        <div className="space-y-2">
          {space.decisions.map((d) => {
            const by = getProfile(d.by);
            return (
              <Card key={d.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Gavel className="w-4 h-4 text-brand-500" />
                  <h4 className="font-medium text-ink-900 text-sm">{d.title}</h4>
                </div>
                <p className="text-sm text-ink-600">{d.rationale}</p>
                <p className="text-xs text-ink-400 mt-1">{by?.name} · {d.decidedAt}</p>
              </Card>
            );
          })}
        </div>
      )}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Log a decision">
        <div className="space-y-3">
          <Field label="Decision"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Rationale"><textarea className="input min-h-[60px]" value={rationale} onChange={(e) => setRationale(e.target.value)} /></Field>
          <div className="flex justify-end gap-2"><button onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button><button onClick={() => { if (title) { addDecision(space.id, { id: `d-${Date.now()}`, title, rationale, decidedAt: new Date().toISOString().slice(0, 10), by: currentUserId }); setShowNew(false); setTitle(''); setRationale(''); } }} className="btn-primary">Log</button></div>
        </div>
      </Modal>
    </div>
  );
}

// ===== Collaboration Record =====
function RecordTab({ space }: { space: CollaborationSpace }) {
  const { acknowledgeRecord, currentUserId, profiles } = useApp();
  const [print, setPrint] = useState(false);
  const r = space.record;
  const me = currentUserId;
  const acknowledged = r.acknowledgments.includes(me);

  return (
    <div className="space-y-4">
      <SectionHeader title="Collaboration Record" subtitle="Reference-only. Not a legal agreement." />
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        This collaboration record is provided for reference and organizational purposes only. It is not legal advice and is not intended to replace a legally prepared agreement.
      </div>

      <Card className="p-5 space-y-4">
        <RecordRow label="Project name" value={r.projectName} />
        <RecordRow label="Opportunity creator" value={getProfile(r.opportunityCreatorId)?.name ?? '—'} />
        <RecordRow label="Idea origin" value={r.ideaOrigin} />
        <RecordRow label="Collaboration began" value={r.beganAt} />
        <div>
          <p className="text-xs text-ink-400 mb-1">Participants</p>
          <div className="space-y-2">
            {r.participants.map((p) => {
              const profile = getProfile(p.profileId);
              return (
                <div key={p.profileId} className="border border-ink-200 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    {profile && <Avatar src={profile.photoUrl} name={profile.name} size={24} />}
                    <span className="text-sm font-medium text-ink-800">{profile?.name}</span>
                    <Badge tone="brand">{p.role}</Badge>
                  </div>
                  <p className="text-xs text-ink-600">Expected contribution: {p.expectedContribution || '—'}</p>
                  <p className="text-xs text-ink-600">Responsibilities: {p.responsibilities || '—'}</p>
                </div>
              );
            })}
          </div>
        </div>
        <RecordRow label="Goals" value={r.goals.join(', ')} />
        <RecordRow label="Milestones" value={r.milestones.join(', ') || '—'} />
        <RecordRow label="Communication expectations" value={r.communicationExpectations} />
        <div>
          <p className="text-xs text-ink-400 mb-1">Major decisions</p>
          {r.majorDecisions.length === 0 ? <p className="text-sm text-ink-500">None logged.</p> : (
            <div className="space-y-1.5">{r.majorDecisions.map((d) => <div key={d.id} className="text-sm text-ink-700"><span className="font-medium">{d.title}</span> — {d.rationale}</div>)}</div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Acknowledgments" />
        <div className="space-y-2 mb-3">
          {r.acknowledgments.map((id) => {
            const p = getProfile(id);
            return p ? <div key={id} className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-accent-500" /> {p.name}</div> : null;
          })}
        </div>
        <button onClick={() => acknowledgeRecord(space.id, me)} disabled={acknowledged} className={acknowledged ? 'btn-secondary' : 'btn-primary'}>
          {acknowledged ? 'Acknowledged' : 'Acknowledge record'}
        </button>
      </Card>

      <button onClick={() => setPrint(true)} className="btn-secondary"><Eye className="w-4 h-4" /> Printable view</button>

      <Modal open={print} onClose={() => setPrint(false)} title="Printable Collaboration Record" wide>
        <div className="space-y-3 text-sm">
          <h2 className="text-lg font-bold">{r.projectName}</h2>
          <p><span className="text-ink-500">Creator:</span> {getProfile(r.opportunityCreatorId)?.name}</p>
          <p><span className="text-ink-500">Began:</span> {r.beganAt}</p>
          <p><span className="text-ink-500">Participants:</span> {r.participants.map((p) => `${getProfile(p.profileId)?.name} (${p.role})`).join(', ')}</p>
          <p><span className="text-ink-500">Goals:</span> {r.goals.join('; ')}</p>
          <p><span className="text-ink-500">Communication:</span> {r.communicationExpectations}</p>
          <p className="text-amber-700 mt-4">This collaboration record is provided for reference and organizational purposes only. It is not legal advice and is not intended to replace a legally prepared agreement.</p>
        </div>
      </Modal>
    </div>
  );
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-ink-400 mb-0.5">{label}</p><p className="text-sm text-ink-800">{value}</p></div>;
}

// ===== Notes =====
function NotesTab({ space }: { space: CollaborationSpace }) {
  const { updateSpace } = useApp();
  return (
    <div className="space-y-3">
      <SectionHeader title="Notes" subtitle="Shared notes for the team." />
      <textarea className="input min-h-[200px]" defaultValue={space.notes} onChange={(e) => updateSpace(space.id, (s) => ({ ...s, notes: e.target.value }))} placeholder="Write shared notes here..." />
    </div>
  );
}

// ===== Files =====
function FilesTab({ space }: { space: CollaborationSpace }) {
  return (
    <div className="space-y-3">
      <SectionHeader title="Files" />
      {space.files.length === 0 ? <EmptyState icon={<FileText className="w-5 h-5" />} title="No files" description="Files would appear here in production." /> : (
        <div className="space-y-2">
          {space.files.map((f) => (
            <Card key={f.id} className="p-3 flex items-center gap-3">
              <FileText className="w-5 h-5 text-ink-400" />
              <div className="flex-1"><p className="text-sm font-medium text-ink-800">{f.name}</p><p className="text-xs text-ink-500">{f.size} · {f.at}</p></div>
            </Card>
          ))}
        </div>
      )}
      <BetaNote>File upload requires storage integration. This is a placeholder for the MVP.</BetaNote>
    </div>
  );
}

// ===== Settings (workspace customization) =====
function SettingsTab({ space }: { space: CollaborationSpace }) {
  const { updateModules } = useApp();
  const [modules, setModules] = useState<WorkspaceModule[]>(space.modules);

  const toggleVisible = (kind: ModuleKind) => setModules((prev) => prev.map((m) => (m.kind === kind ? { ...m, visible: !m.visible } : m)));
  const togglePinned = (kind: ModuleKind) => setModules((prev) => prev.map((m) => (m.kind === kind ? { ...m, pinned: !m.pinned } : m)));
  const move = (kind: ModuleKind, dir: -1 | 1) => {
    setModules((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((m) => m.kind === kind);
      const swap = idx + dir;
      if (swap < 0 || swap >= sorted.length) return prev;
      [sorted[idx].order, sorted[swap].order] = [sorted[swap].order, sorted[idx].order];
      return [...sorted];
    });
  };
  const applyPreset = (preset: ModuleKind[]) => {
    const newModules = MODULE_CATALOG.map((mc) => {
      const inPreset = preset.includes(mc.kind);
      const existing = modules.find((m) => m.kind === mc.kind);
      return { kind: mc.kind, label: mc.label, pinned: inPreset && preset.indexOf(mc.kind) < 4, visible: inPreset, order: preset.indexOf(mc.kind) >= 0 ? preset.indexOf(mc.kind) : 99 };
    }).filter((m) => m.visible);
    setModules(newModules);
  };
  const save = () => updateModules(space.id, modules);

  return (
    <div className="space-y-5">
      <SectionHeader title="Workspace settings" subtitle="Customize modules. Add, remove, reorder, and pin." />

      {/* Presets */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-ink-800 mb-2">Presets</h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(MODULE_PRESETS).map((name) => (
            <button key={name} onClick={() => applyPreset(MODULE_PRESETS[name])} className="btn-secondary text-sm">{name}</button>
          ))}
        </div>
      </Card>

      {/* Module list */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-ink-800 mb-3">Modules</h3>
        <div className="space-y-1.5">
          {[...modules].sort((a, b) => a.order - b.order).map((m) => (
            <div key={m.kind} className="flex items-center gap-2 p-2 rounded-lg border border-ink-200">
              <GripVertical className="w-4 h-4 text-ink-300" />
              <span className="text-sm font-medium text-ink-800 flex-1">{m.label}</span>
              <button onClick={() => move(m.kind, -1)} className="btn-ghost p-1.5 text-xs">Up</button>
              <button onClick={() => move(m.kind, 1)} className="btn-ghost p-1.5 text-xs">Down</button>
              <button onClick={() => togglePinned(m.kind)} className="btn-ghost p-1.5">{m.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}</button>
              <button onClick={() => toggleVisible(m.kind)} className="btn-ghost p-1.5">{m.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={save} className="btn-primary">Save layout</button>
          <span className="text-xs text-ink-500">Changes apply to the sidebar after saving.</span>
        </div>
      </Card>

      {/* Check-in settings */}
      <CheckInSettings space={space} />
    </div>
  );
}

function CheckInSettings({ space }: { space: CollaborationSpace }) {
  const { setCheckInFrequency } = useApp();
  const [freq, setFreq] = useState<CheckInFrequency>(space.checkInFrequency);
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-ink-800 mb-2">Partnership check-in frequency</h3>
      <div className="flex flex-wrap gap-2">
        {(['Weekly', 'Monthly', 'Quarterly', 'Custom'] as CheckInFrequency[]).map((f) => (
          <button key={f} onClick={() => { setFreq(f); setCheckInFrequency(space.id, f); }} className={`btn px-4 py-2 text-sm ${freq === f ? 'bg-brand-600 text-white' : 'bg-white text-ink-600 border border-ink-200'}`}>{f}</button>
        ))}
      </div>
    </Card>
  );
}

// ===== Toolkit =====
function ToolkitTab({ space }: { space: CollaborationSpace }) {
  return (
    <div className="space-y-4">
      <SectionHeader title="Founder & Collaboration Toolkit" subtitle="Non-legal planning resources." />
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
        These resources are for planning only. They are not legal advice. Legal-template integrations are a future placeholder.
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { title: 'Collaboration summary builder', desc: 'Outline who is doing what and why.' },
          { title: 'Role & responsibility worksheet', desc: 'Clarify roles across the team.' },
          { title: 'Contribution tracker', desc: 'Track what each person contributes.' },
          { title: 'Meeting agenda', desc: 'Run focused team meetings.' },
          { title: 'Decision log', desc: 'Already available in this space.' },
          { title: 'Milestone planner', desc: 'Already available in this space.' },
          { title: 'Partnership check-in', desc: 'Run a structured check-in now.' },
          { title: 'Printable project summary', desc: 'Export a one-page summary.' },
        ].map((t) => (
          <Card key={t.title} className="p-4">
            <h4 className="font-medium text-ink-900 text-sm">{t.title}</h4>
            <p className="text-xs text-ink-500 mt-1">{t.desc}</p>
            <button className="btn-ghost text-sm mt-2">Open <ChevronRight className="w-4 h-4" /></button>
          </Card>
        ))}
      </div>
      <BetaNote>Toolkit templates are interactive placeholders in this MVP.</BetaNote>
    </div>
  );
}

// ===== Helpers =====
function computeOverall(tasks: Task[]): number {
  if (!tasks.length) return 0;
  const total = tasks.reduce((s, t) => s + t.checklist.length, 0);
  if (total === 0) return 0;
  const approved = tasks.reduce((s, t) => s + t.checklist.filter((c) => c.done && !c.submittedForReview).length, 0);
  return Math.round((approved / total) * 100);
}
