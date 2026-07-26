import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type {
  Profile,
  Opportunity,
  CollaborationSpace,
  Conversation,
  AppNotification,
  CollaborationGroup,
  Task,
  ChecklistItem,
  TaskStatus,
  Feedback,
  ID,
  ModuleKind,
  WorkspaceModule,
  Milestone,
  Decision,
  CheckIn,
  CheckInFrequency,
  TrustState,
} from './types';
import {
  PROFILES,
  GROUPS,
  OPPORTUNITIES,
  SPACES,
  CONVERSATIONS,
  NOTIFICATIONS,
  MY_TRUST,
} from './data';

export type Route =
  | { name: 'landing' }
  | { name: 'home' }
  | { name: 'discover' }
  | { name: 'people' }
  | { name: 'my-opportunities' }
  | { name: 'space'; spaceId: ID }
  | { name: 'messages' }
  | { name: 'notifications' }
  | { name: 'profile'; profileId?: ID }
  | { name: 'trust' }
  | { name: 'settings' }
  | { name: 'opportunity'; opportunityId: ID }
  | { name: 'create-opportunity' }
  | { name: 'toolkit' }
  | { name: 'professionals' }
  | { name: 'professional'; professionalId: ID }
  | { name: 'companies' }
  | { name: 'company'; companyId: ID }
  | { name: 'partners' }
  | { name: 'pricing' }
  | { name: 'success-stories' }
  | { name: 'resources' }
  | { name: 'resource'; slug: string }
  | { name: 'admin' }
  | { name: 'admin-users' }
  | { name: 'admin-verification' }
  | { name: 'admin-moderation' }
  | { name: 'admin-collaborations' }
  | { name: 'admin-audit' };

interface AppState {
  route: Route;
  navigate: (r: Route) => void;
  currentUserId: ID;
  profiles: Profile[];
  groups: CollaborationGroup[];
  opportunities: Opportunity[];
  spaces: CollaborationSpace[];
  conversations: Conversation[];
  notifications: AppNotification[];
  trust: TrustState;
  // actions
  createOpportunity: (o: Opportunity) => void;
  createSpaceFromOpportunity: (oppId: ID, name: string, description: string, memberIds: ID[]) => ID;
  updateSpace: (spaceId: ID, updater: (s: CollaborationSpace) => CollaborationSpace) => void;
  addTask: (spaceId: ID, task: Task) => void;
  updateTask: (spaceId: ID, taskId: ID, updater: (t: Task) => Task) => void;
  submitForReview: (spaceId: ID, taskId: ID) => void;
  reviewTask: (spaceId: ID, taskId: ID, action: 'approve' | 'changes' | 'discussion', feedback?: Omit<Feedback, 'id' | 'at'>) => void;
  toggleChecklistItem: (spaceId: ID, taskId: ID, itemId: ID) => void;
  toggleChecklistReview: (spaceId: ID, taskId: ID, itemId: ID) => void;
  updateModules: (spaceId: ID, modules: WorkspaceModule[]) => void;
  addMilestone: (spaceId: ID, m: Milestone) => void;
  toggleMilestone: (spaceId: ID, milestoneId: ID) => void;
  addDecision: (spaceId: ID, d: Decision) => void;
  addCheckIn: (spaceId: ID, ci: CheckIn) => void;
  setCheckInFrequency: (spaceId: ID, f: CheckInFrequency) => void;
  acknowledgeRecord: (spaceId: ID, profileId: ID) => void;
  sendMessage: (convId: ID, text: string) => void;
  startConversation: (participantIds: ID[], title: string, type?: Conversation['type'], spaceId?: ID) => ID;
  markNotificationRead: (id: ID) => void;
  markAllNotificationsRead: () => void;
  updateProfile: (p: Profile) => void;
  reportUser: (targetId: ID, reason: string) => void;
  reportOpportunity: (targetId: ID, reason: string) => void;
}

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const nowISO = () => new Date().toISOString();

function taskProgress(t: Task): { done: number; total: number; pct: number; approvedPct: number } {
  const total = t.checklist.length;
  const done = t.checklist.filter((c) => c.done).length;
  const approvedDone = t.checklist.filter((c) => c.done && !c.submittedForReview).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const approvedPct = total ? Math.round((approvedDone / total) * 100) : 0;
  return { done, total, pct, approvedPct };
}

export { taskProgress };

export function AppProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>({ name: 'landing' });
  const [profiles, setProfiles] = useState<Profile[]>(PROFILES);
  const [groups] = useState<CollaborationGroup[]>(GROUPS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(OPPORTUNITIES);
  const [spaces, setSpaces] = useState<CollaborationSpace[]>(SPACES);
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS);
  const [notifications, setNotifications] = useState<AppNotification[]>(NOTIFICATIONS);
  const [trust, setTrust] = useState<TrustState>(MY_TRUST);
  const currentUserId = 'p-me';

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const createOpportunity = useCallback((o: Opportunity) => {
    setOpportunities((prev) => [o, ...prev]);
  }, []);

  const createSpaceFromOpportunity = useCallback(
    (oppId: ID, name: string, description: string, memberIds: ID[]): ID => {
      const id = uid('cs');
      const opp = opportunities.find((o) => o.id === oppId);
      const newSpace: CollaborationSpace = {
        id,
        opportunityId: oppId,
        name,
        description,
        mission: opp?.description ?? '',
        successDefinition: '',
        memberIds,
        roles: Object.fromEntries(memberIds.map((m, i) => [m, i === 0 ? 'Lead' : 'Contributor'])),
        tasks: [],
        milestones: [],
        files: [],
        notes: '',
        decisions: [],
        activity: [{ id: uid('a'), at: nowISO(), text: 'Space created', actorId: currentUserId }],
        modules: defaultModules(opp?.category),
        record: {
          projectName: name,
          opportunityCreatorId: opp?.ownerId ?? currentUserId,
          ideaOrigin: 'Created from an opportunity listing.',
          beganAt: nowISO().slice(0, 10),
          participants: memberIds.map((p) => ({
            profileId: p,
            role: p === opp?.ownerId ? 'Lead' : 'Contributor',
            expectedContribution: '',
            responsibilities: '',
          })),
          goals: opp?.goals ?? [],
          milestones: [],
          communicationExpectations: 'Weekly check-in, async in team chat.',
          majorDecisions: [],
          acknowledgments: [currentUserId],
        },
        checkIns: [],
        checkInFrequency: 'Weekly',
        nextCheckIn: '',
      };
      setSpaces((prev) => [newSpace, ...prev]);
      return id;
    },
    [opportunities, currentUserId]
  );

  const updateSpace = useCallback((spaceId: ID, updater: (s: CollaborationSpace) => CollaborationSpace) => {
    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? updater(s) : s)));
  }, []);

  const addTask = useCallback((spaceId: ID, task: Task) => {
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === spaceId
          ? { ...s, tasks: [...s.tasks, task], activity: [{ id: uid('a'), at: nowISO(), text: `Task created: ${task.title}`, actorId: task.ownerId }, ...s.activity] }
          : s
      )
    );
  }, []);

  const updateTask = useCallback((spaceId: ID, taskId: ID, updater: (t: Task) => Task) => {
    setSpaces((prev) =>
      prev.map((s) =>
        s.id === spaceId
          ? { ...s, tasks: s.tasks.map((t) => (t.id === taskId ? updater(t) : t)) }
          : s
      )
    );
  }, []);

  const toggleChecklistItem = useCallback((spaceId: ID, taskId: ID, itemId: ID) => {
    updateTask(spaceId, taskId, (t) => ({
      ...t,
      checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done, submittedForReview: c.done ? false : c.submittedForReview } : c)),
    }));
  }, [updateTask]);

  const toggleChecklistReview = useCallback((spaceId: ID, taskId: ID, itemId: ID) => {
    updateTask(spaceId, taskId, (t) => ({
      ...t,
      checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, submittedForReview: !c.submittedForReview } : c)),
    }));
  }, [updateTask]);

  const submitForReview = useCallback((spaceId: ID, taskId: ID) => {
    setSpaces((prev) =>
      prev.map((s) => {
        if (s.id !== spaceId) return s;
        const task = s.tasks.find((t) => t.id === taskId);
        if (!task) return s;
        const updatedTask: Task = {
          ...task,
          status: 'Ready for review',
          checklist: task.checklist.map((c) => (c.done ? { ...c, submittedForReview: true } : c)),
          revisions: [...task.revisions, { version: task.revisions.length + 1, at: nowISO(), by: task.ownerId, note: 'Submitted for review', status: 'Ready for review' }],
        };
        return {
          ...s,
          tasks: s.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
          activity: [{ id: uid('a'), at: nowISO(), text: `${task.title} submitted for review`, actorId: task.ownerId }, ...s.activity],
        };
      })
    );
  }, []);

  const reviewTask = useCallback(
    (spaceId: ID, taskId: ID, action: 'approve' | 'changes' | 'discussion', feedback?: Omit<Feedback, 'id' | 'at'>) => {
      setSpaces((prev) =>
        prev.map((s) => {
          if (s.id !== spaceId) return s;
          const task = s.tasks.find((t) => t.id === taskId);
          if (!task) return s;
          let newStatus: TaskStatus;
          if (action === 'approve') newStatus = 'Approved';
          else if (action === 'changes') newStatus = 'Changes requested';
          else newStatus = 'Needs discussion';
          const updatedTask: Task = {
            ...task,
            status: newStatus,
            revisions: [...task.revisions, { version: task.revisions.length + 1, at: nowISO(), by: task.reviewerId, note: action === 'approve' ? 'Approved' : action === 'changes' ? 'Changes requested' : 'Needs discussion', status: newStatus }],
            feedback: action === 'changes' && feedback ? { ...feedback, id: uid('fb'), at: nowISO() } : task.feedback,
            checklist: action === 'approve' ? task.checklist.map((c) => ({ ...c, submittedForReview: false })) : task.checklist,
          };
          const activityText =
            action === 'approve' ? `${task.title} approved` : action === 'changes' ? `Changes requested on ${task.title}` : `${task.title} needs discussion`;
          return {
            ...s,
            tasks: s.tasks.map((t) => (t.id === taskId ? updatedTask : t)),
            activity: [{ id: uid('a'), at: nowISO(), text: activityText, actorId: task.reviewerId }, ...s.activity],
          };
        })
      );
    },
    []
  );

  const updateModules = useCallback((spaceId: ID, modules: WorkspaceModule[]) => {
    updateSpace(spaceId, (s) => ({ ...s, modules }));
  }, [updateSpace]);

  const addMilestone = useCallback((spaceId: ID, m: Milestone) => {
    updateSpace(spaceId, (s) => ({ ...s, milestones: [...s.milestones, m] }));
  }, [updateSpace]);

  const toggleMilestone = useCallback((spaceId: ID, milestoneId: ID) => {
    updateSpace(spaceId, (s) => ({
      ...s,
      milestones: s.milestones.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m)),
      activity: s.activity,
    }));
  }, [updateSpace]);

  const addDecision = useCallback((spaceId: ID, d: Decision) => {
    updateSpace(spaceId, (s) => ({
      ...s,
      decisions: [d, ...s.decisions],
      record: { ...s.record, majorDecisions: [d, ...s.record.majorDecisions] },
      activity: [{ id: uid('a'), at: nowISO(), text: `Decision logged: ${d.title}`, actorId: d.by }, ...s.activity],
    }));
  }, [updateSpace]);

  const addCheckIn = useCallback((spaceId: ID, ci: CheckIn) => {
    updateSpace(spaceId, (s) => ({ ...s, checkIns: [ci, ...s.checkIns] }));
  }, [updateSpace]);

  const setCheckInFrequency = useCallback((spaceId: ID, f: CheckInFrequency) => {
    updateSpace(spaceId, (s) => ({ ...s, checkInFrequency: f }));
  }, [updateSpace]);

  const acknowledgeRecord = useCallback((spaceId: ID, profileId: ID) => {
    updateSpace(spaceId, (s) => ({
      ...s,
      record: { ...s.record, acknowledgments: s.record.acknowledgments.includes(profileId) ? s.record.acknowledgments : [...s.record.acknowledgments, profileId] },
    }));
  }, [updateSpace]);

  const sendMessage = useCallback((convId: ID, text: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, messages: [...c.messages, { id: uid('msg'), authorId: currentUserId, text, at: nowISO() }] }
          : c
      )
    );
  }, [currentUserId]);

  const startConversation = useCallback((participantIds: ID[], title: string, type: Conversation['type'] = 'group', spaceId?: ID): ID => {
    const id = uid('conv');
    setConversations((prev) => [
      { id, type, title, participantIds: [...participantIds, currentUserId], spaceId, messages: [] },
      ...prev,
    ]);
    return id;
  }, [currentUserId]);

  const markNotificationRead = useCallback((id: ID) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const updateProfile = useCallback((p: Profile) => {
    setProfiles((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  }, []);

  const reportUser = useCallback((targetId: ID, reason: string) => {
    setTrust((prev) => ({
      ...prev,
      reports: [...prev.reports, { id: uid('rep'), targetType: 'user', targetId, reason, status: 'Submitted', at: nowISO() }],
    }));
  }, []);

  const reportOpportunity = useCallback((targetId: ID, reason: string) => {
    setTrust((prev) => ({
      ...prev,
      reports: [...prev.reports, { id: uid('rep'), targetType: 'opportunity', targetId, reason, status: 'Submitted', at: nowISO() }],
    }));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      route, navigate, currentUserId, profiles, groups, opportunities, spaces, conversations, notifications, trust,
      createOpportunity, createSpaceFromOpportunity, updateSpace, addTask, updateTask, submitForReview, reviewTask,
      toggleChecklistItem, toggleChecklistReview, updateModules, addMilestone, toggleMilestone, addDecision, addCheckIn,
      setCheckInFrequency, acknowledgeRecord, sendMessage, startConversation, markNotificationRead, markAllNotificationsRead,
      updateProfile, reportUser, reportOpportunity,
    }),
    [route, navigate, currentUserId, profiles, groups, opportunities, spaces, conversations, notifications, trust,
     createOpportunity, createSpaceFromOpportunity, updateSpace, addTask, updateTask, submitForReview, reviewTask,
     toggleChecklistItem, toggleChecklistReview, updateModules, addMilestone, toggleMilestone, addDecision, addCheckIn,
     setCheckInFrequency, acknowledgeRecord, sendMessage, startConversation, markNotificationRead, markAllNotificationsRead,
     updateProfile, reportUser, reportOpportunity]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function defaultModules(category?: string): WorkspaceModule[] {
  const core: { kind: ModuleKind; label: string }[] = [
    { kind: 'team_chat', label: 'Team Chat' },
    { kind: 'tasks', label: 'Tasks' },
    { kind: 'milestones', label: 'Milestones' },
    { kind: 'decision_log', label: 'Decision Log' },
    { kind: 'collaboration_record', label: 'Collaboration Record' },
    { kind: 'notes', label: 'Notes' },
    { kind: 'files', label: 'Files' },
    { kind: 'calendar', label: 'Calendar' },
    { kind: 'project_timeline', label: 'Project Timeline' },
  ];
  const extraByCat: Record<string, { kind: ModuleKind; label: string }[]> = {
    'Real Estate': [{ kind: 'property_tracker', label: 'Property Tracker' }, { kind: 'budget', label: 'Budget' }, { kind: 'vendors', label: 'Vendors' }],
    Technology: [{ kind: 'hiring', label: 'Hiring' }, { kind: 'investors', label: 'Investors' }],
    'Cleaning & Services': [{ kind: 'customer_pipeline', label: 'Customer Pipeline' }, { kind: 'hiring', label: 'Hiring' }, { kind: 'equipment_tracker', label: 'Equipment Tracker' }],
    'Film & Media': [{ kind: 'contacts', label: 'Contacts' }, { kind: 'budget', label: 'Budget' }],
    'E-commerce': [{ kind: 'customer_pipeline', label: 'Customer Pipeline' }, { kind: 'vendors', label: 'Vendors' }, { kind: 'budget', label: 'Budget' }],
  };
  const extra = (category && extraByCat[category]) || [];
  return [...core, ...extra].map((m, i) => ({ kind: m.kind, label: m.label, pinned: i < 4, visible: true, order: i }));
}

export const MODULE_CATALOG: { kind: ModuleKind; label: string; description: string }[] = [
  { kind: 'team_chat', label: 'Team Chat', description: 'Conversation for the team' },
  { kind: 'tasks', label: 'Tasks', description: 'Tasks with checklists and reviews' },
  { kind: 'calendar', label: 'Calendar', description: 'Dates and deadlines' },
  { kind: 'milestones', label: 'Milestones', description: 'Key milestones' },
  { kind: 'files', label: 'Files', description: 'Shared files' },
  { kind: 'notes', label: 'Notes', description: 'Shared notes' },
  { kind: 'budget', label: 'Budget', description: 'Budget tracker' },
  { kind: 'contacts', label: 'Contacts', description: 'Contacts directory' },
  { kind: 'vendors', label: 'Vendors', description: 'Vendor list' },
  { kind: 'customer_pipeline', label: 'Customer Pipeline', description: 'Pipeline of leads and clients' },
  { kind: 'property_tracker', label: 'Property Tracker', description: 'Properties and status' },
  { kind: 'equipment_tracker', label: 'Equipment Tracker', description: 'Equipment inventory' },
  { kind: 'investors', label: 'Investors', description: 'Investor pipeline' },
  { kind: 'hiring', label: 'Hiring', description: 'Open roles and candidates' },
  { kind: 'project_timeline', label: 'Project Timeline', description: 'Timeline of events' },
  { kind: 'decision_log', label: 'Decision Log', description: 'Major decisions' },
  { kind: 'collaboration_record', label: 'Collaboration Record', description: 'Reference record' },
];

export const MODULE_PRESETS: Record<string, ModuleKind[]> = {
  'Real Estate Project': ['team_chat', 'tasks', 'milestones', 'property_tracker', 'budget', 'vendors', 'decision_log', 'collaboration_record', 'files', 'notes'],
  'Technology Startup': ['team_chat', 'tasks', 'milestones', 'hiring', 'investors', 'project_timeline', 'decision_log', 'collaboration_record', 'files', 'notes'],
  'Service Business': ['team_chat', 'tasks', 'milestones', 'customer_pipeline', 'hiring', 'equipment_tracker', 'budget', 'decision_log', 'collaboration_record', 'notes'],
  'Creative Project': ['team_chat', 'tasks', 'milestones', 'contacts', 'budget', 'files', 'decision_log', 'collaboration_record', 'notes'],
  'E-commerce Business': ['team_chat', 'tasks', 'milestones', 'customer_pipeline', 'vendors', 'budget', 'decision_log', 'collaboration_record', 'files', 'notes'],
  'General Collaboration': ['team_chat', 'tasks', 'milestones', 'notes', 'files', 'decision_log', 'collaboration_record', 'project_timeline'],
};
