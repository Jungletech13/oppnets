Exit code: 0
Wall time: 1 seconds
Output:
import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
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
  GROUPS,
  SPACES,
  MY_TRUST,
} from './data';
import { useAuth } from '@/lib/auth';
import {
  createOpportunity as persistOpportunity,
  createCollaborationSpace,
  createTask,
  fetchOpportunities,
  fetchProfiles,
  fetchUserSpacesWithDetails,
  fetchConversations,
  fetchNotifications,
  sendMessage as persistMessage,
  markNotificationRead as persistNotificationRead,
  markAllNotificationsRead as persistAllNotificationsRead,
  fetchUserReports,
  fetchUserAppeals,
  submitUserReport,
  submitModerationAppeal,
  updatePersistedTask,
  updateProfile as persistProfile,
} from '@/lib/queries';
import { mapConversationRow, mapNotificationRow, mapOpportunityRow, mapProfileRow, mapSpaceRow, profileToUpdate } from '@/lib/domain-mappers';

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
  | { name: 'admin-audit' }
  | { name: 'admin-subscriptions' };

const routeStorageKey = 'oppnets:last-route';
const routeNames = new Set<Route['name']>([
  'landing', 'home', 'discover', 'people', 'my-opportunities', 'space', 'messages',
  'notifications', 'profile', 'trust', 'settings', 'opportunity', 'create-opportunity',
  'toolkit', 'professionals', 'professional', 'companies', 'company', 'partners',
  'pricing', 'success-stories', 'resources', 'resource', 'admin', 'admin-users',
  'admin-verification', 'admin-moderation', 'admin-collaborations', 'admin-audit',
  'admin-subscriptions',
]);

function restoreRoute(): Route {
  if (window.location.hash.startsWith('#/')) {
    const [rawName, rawQuery = ''] = window.location.hash.slice(2).split('?');
    const name = decodeURIComponent(rawName) as Route['name'];
    if (routeNames.has(name)) {
      return { name, ...Object.fromEntries(new URLSearchParams(rawQuery)) } as Route;
    }
  }
  try {
    const saved = window.sessionStorage.getItem(routeStorageKey);
    if (!saved) return { name: 'landing' };
    const parsed = JSON.parse(saved) as Partial<Route>;
    return parsed.name && routeNames.has(parsed.name) ? parsed as Route : { name: 'landing' };
  } catch {
    return { name: 'landing' };
  }
}

function routeUrl(route: Route) {
  const { name, ...params } = route;
  const query = new URLSearchParams(params as Record<string, string>).toString();
  return `#/${encodeURIComponent(name)}${query ? `?${query}` : ''}`;
}

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
  dataLoading: boolean;
  dataError: string | null;
  retryDataLoad: () => void;
  // actions
  createOpportunity: (o: Opportunity) => Promise<Opportunity>;
  createSpaceFromOpportunity: (oppId: ID, name: string, description: string, memberIds: ID[]) => Promise<ID>;
  updateSpace: (spaceId: ID, updater: (s: CollaborationSpace) => CollaborationSpace) => void;
  addTask: (spaceId: ID, task: Task) => Promise<void>;
  updateTask: (spaceId: ID, taskId: ID, updater: (t: Task) => Task) => Promise<void>;
  submitForReview: (spaceId: ID, taskId: ID) => Promise<void>;
  reviewTask: (spaceId: ID, taskId: ID, action: 'approve' | 'changes' | 'discussion', feedback?: Omit<Feedback, 'id' | 'at'>) => Promise<void>;
  toggleChecklistItem: (spaceId: ID, taskId: ID, itemId: ID) => Promise<void>;
  toggleChecklistReview: (spaceId: ID, taskId: ID, itemId: ID) => Promise<void>;
  updateModules: (spaceId: ID, modules: WorkspaceModule[]) => void;
  addMilestone: (spaceId: ID, m: Milestone) => void;
  toggleMilestone: (spaceId: ID, milestoneId: ID) => void;
  addDecision: (spaceId: ID, d: Decision) => void;
  addCheckIn: (spaceId: ID, ci: CheckIn) => void;
  setCheckInFrequency: (spaceId: ID, f: CheckInFrequency) => void;
  acknowledgeRecord: (spaceId: ID, profileId: ID) => void;
  sendMessage: (convId: ID, text: string) => Promise<void>;
  startConversation: (participantIds: ID[], title: string, type?: Conversation['type'], spaceId?: ID) => ID;
  markNotificationRead: (id: ID) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateProfile: (p: Profile) => Promise<void>;
  reportUser: (targetId: ID, reason: string) => Promise<void>;
  reportOpportunity: (targetId: ID, reason: string) => Promise<void>;
  submitAppeal: (decision: string, reason: string) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 9)}`;
const nowISO = () => new Date().toISOString();
const reportStatus = (status: string): import('./types').Report['status'] => {
  const labels: Record<string, import('./types').Report['status']> = {
    submitted: 'Submitted',
    under_review: 'Under review',
    resolved: 'Resolved',
    dismissed: 'Dismissed',
  };
  return labels[status] ?? 'Submitted';
};

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
  const { user } = useAuth();
  const [route, setRoute] = useState<Route>(restoreRoute);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [groups] = useState<CollaborationGroup[]>(GROUPS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [spaces, setSpaces] = useState<CollaborationSpace[]>(SPACES);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [trust, setTrust] = useState<TrustState>(MY_TRUST);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const currentUserId = user?.id ?? '';

  useEffect(() => {
    if (!user) return;
    let active = true;
    setDataLoading(true);
    setDataError(null);
    Promise.all([fetchProfiles(), fetchOpportunities(), fetchUserSpacesWithDetails(user.id), fetchConversations(user.id), fetchNotifications(user.id), fetchUserReports(user.id), fetchUserAppeals(user.id)])
      .then(([profileRows, opportunityRows, spaceRows, conversationRows, notificationRows, reportRows, appealRows]) => {
        if (!active) return;
        setProfiles((profileRows || []).map((row) => mapProfileRow(row as Record<string, unknown>)));
        setOpportunities((opportunityRows || []).map((row) => mapOpportunityRow(row as Record<string, unknown>)));
        setSpaces((spaceRows || []).filter(Boolean).map((row) => mapSpaceRow(row as Record<string, unknown>)));
        setConversations((conversationRows || []).map((row) => mapConversationRow(row as Record<string, unknown>)));
        setNotifications((notificationRows || []).map((row) => mapNotificationRow(row as Record<string, unknown>)));
        setTrust((current) => ({
          ...current,
          reports: (reportRows || []).map((row) => ({
            id: row.id as string,
            targetType: row.target_type as 'user' | 'opportunity',
            targetId: row.target_id as string,
            reason: row.reason as string,
            status: reportStatus(row.status as string),
            at: row.created_at as string,
          })),
          appealStatus: appealRows?.[0] ? reportStatus(appealRows[0].status as string) : undefined,
        }));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDataError(error instanceof Error ? error.message : 'Could not load your OppNets data.');
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });
    return () => { active = false; };
  }, [user, loadVersion]);

  useEffect(() => {
    const restoreFromUrl = () => setRoute(restoreRoute());
    window.addEventListener('popstate', restoreFromUrl);
    window.addEventListener('hashchange', restoreFromUrl);
    return () => {
      window.removeEventListener('popstate', restoreFromUrl);
      window.removeEventListener('hashchange', restoreFromUrl);
    };
  }, []);

  const retryDataLoad = useCallback(() => setLoadVersion((version) => version + 1), []);

  const navigate = useCallback((r: Route) => {
    setRoute(r);
    window.history.pushState({ route: r }, '', routeUrl(r));
    try {
      window.sessionStorage.setItem(routeStorageKey, JSON.stringify(r));
    } catch {
      // Navigation still works when browser storage is restricted.
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const createOpportunity = useCallback(async (o: Opportunity) => {
    const persisted = await persistOpportunity(o);
    setOpportunities((prev) => [persisted, ...prev]);
    return persisted;
  }, []);

  const createSpaceFromOpportunity = useCallback(
    async (oppId: ID, name: string, description: string, memberIds: ID[]): Promise<ID> => {
      const opp = opportunities.find((o) => o.id === oppId);
      const row = await createCollaborationSpace({ opportunityId: oppId, name, description, mission: opp?.description ?? '', memberIds });
      if (!row) throw new Error('Created collaboration space could not be loaded.');
      const newSpace = mapSpaceRow(row as Record<string, unknown>);
      setSpaces((prev) => [newSpace, ...prev]);
      return newSpace.id;
    },
    [opportunities, currentUserId]
  );

  const updateSpace = useCallback((spaceId: ID, updater: (s: CollaborationSpace) => CollaborationSpace) => {
    setSpaces((prev) => prev.map((s) => (s.id === spaceId ? updater(s) : s)));
  }, []);

  const addTask = useCallback(async (spaceId: ID, task: Task) => {
    const row = await createTask(spaceId, task);
    if (!row) throw new Error('Created task could not be loaded.');
    const persistedSpace = mapSpaceRow(row as Record<string, unknown>);
    setSpaces((prev) => prev.map((space) => (space.id === spaceId ? persistedSpace : space)));
  }, []);

  const updateTask = useCallback(async (spaceId: ID, taskId: ID, updater: (t: Task) => Task) => {
    const task = spaces.find((space) => space.id === spaceId)?.tasks.find((candidate) => candidate.id === taskId);
    if (!task) throw new Error('Task not found.');
    const row = await updatePersistedTask(spaceId, updater(task));
    if (!row) throw new Error('Updated task could not be loaded.');
    const persistedSpace = mapSpaceRow(row as Record<string, unknown>);
    setSpaces((prev) => prev.map((space) => (space.id === spaceId ? persistedSpace : space)));
  }, [spaces]);

  const toggleChecklistItem = useCallback(async (spaceId: ID, taskId: ID, itemId: ID) => {
    await updateTask(spaceId, taskId, (t) => ({
      ...t,
      checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done, submittedForReview: c.done ? false : c.submittedForReview } : c)),
    }));
  }, [updateTask]);

  const toggleChecklistReview = useCallback(async (spaceId: ID, taskId: ID, itemId: ID) => {
    await updateTask(spaceId, taskId, (t) => ({
      ...t,
      checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, submittedForReview: !c.submittedForReview } : c)),
    }));
  }, [updateTask]);

  const submitForReview = useCallback(async (spaceId: ID, taskId: ID) => {
    await updateTask(spaceId, taskId, (task) => ({
          ...task,
          status: 'Ready for review',
          checklist: task.checklist.map((c) => (c.done ? { ...c, submittedForReview: true } : c)),
          revisions: [...task.revisions, { version: task.revisions.length + 1, at: nowISO(), by: task.ownerId, note: 'Submitted for review', status: 'Ready for review' }],
    }));
  }, [updateTask]);

  const reviewTask = useCallback(
    async (spaceId: ID, taskId: ID, action: 'approve' | 'changes' | 'discussion', feedback?: Omit<Feedback, 'id' | 'at'>) => {
      await updateTask(spaceId, taskId, (task) => {
          let newStatus: TaskStatus;
          if (action === 'approve') newStatus = 'Approved';
          else if (action === 'changes') newStatus = 'Changes requested';
          else newStatus = 'Needs discussion';
          return {
            ...task,
            status: newStatus,
            revisions: [...task.revisions, { version: task.revisions.length + 1, at: nowISO(), by: task.reviewerId, note: action === 'approve' ? 'Approved' : action === 'changes' ? 'Changes requested' : 'Needs discussion', status: newStatus }],
            feedback: action === 'changes' && feedback ? { ...feedback, id: uid('fb'), at: nowISO() } : task.feedback,
            checklist: action === 'approve' ? task.checklist.map((c) => ({ ...c, submittedForReview: false })) : task.checklist,
          };
      });
    },
    [updateTask]
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

  const sendMessage = useCallback(async (convId: ID, text: string) => {
    const row = await persistMessage(convId, text.trim());
    if (!row) throw new Error('Message could not be saved.');
    const message = { id: row.id as string, authorId: row.author_id as string, text: row.text as string, at: row.at as string };
    setConversations((prev) => prev.map((conversation) =>
      conversation.id === convId ? { ...conversation, messages: [...conversation.messages, message] } : conversation
    ));
  }, []);

  const startConversation = useCallback((participantIds: ID[], title: string, type: Conversation['type'] = 'group', spaceId?: ID): ID => {
    const id = uid('conv');
    setConversations((prev) => [
      { id, type, title, participantIds: [...participantIds, currentUserId], spaceId, messages: [] },
      ...prev,
    ]);
    return id;
  }, [currentUserId]);

  const markNotificationRead = useCallback(async (id: ID) => {
    await persistNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    await persistAllNotificationsRead(currentUserId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [currentUserId]);

  const updateProfile = useCallback(async (p: Profile) => {
    await persistProfile(p.id, profileToUpdate(p));
    setProfiles((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  }, []);

  const reportUser = useCallback(async (targetId: ID, reason: string) => {
    const row = await submitUserReport('user', targetId, reason);
    setTrust((prev) => ({
      ...prev,
      reports: [{ id: row.id as string, targetType: 'user', targetId, reason: row.reason as string, status: reportStatus(row.status as string), at: row.created_at as string }, ...prev.reports],
    }));
  }, []);

  const reportOpportunity = useCallback(async (targetId: ID, reason: string) => {
    const row = await submitUserReport('opportunity', targetId, reason);
    setTrust((prev) => ({
      ...prev,
      reports: [{ id: row.id as string, targetType: 'opportunity', targetId, reason: row.reason as string, status: reportStatus(row.status as string), at: row.created_at as string }, ...prev.reports],
    }));
  }, []);

  const submitAppeal = useCallback(async (decision: string, reason: string) => {
    const row = await submitModerationAppeal(decision, reason);
    setTrust((prev) => ({ ...prev, appealStatus: reportStatus(row.status as string) }));
  }, []);

  const value = useMemo<AppState>(
    () => ({
      route, navigate, currentUserId, profiles, groups, opportunities, spaces, conversations, notifications, trust,
      dataLoading, dataError, retryDataLoad,
      createOpportunity, createSpaceFromOpportunity, updateSpace, addTask, updateTask, submitForReview, reviewTask,
      toggleChecklistItem, toggleChecklistReview, updateModules, addMilestone, toggleMilestone, addDecision, addCheckIn,
      setCheckInFrequency, acknowledgeRecord, sendMessage, startConversation, markNotificationRead, markAllNotificationsRead,
      updateProfile, reportUser, reportOpportunity, submitAppeal,
    }),
    [route, navigate, currentUserId, profiles, groups, opportunities, spaces, conversations, notifications, trust,
     dataLoading, dataError, retryDataLoad,
     createOpportunity, createSpaceFromOpportunity, updateSpace, addTask, updateTask, submitForReview, reviewTask,
     toggleChecklistItem, toggleChecklistReview, updateModules, addMilestone, toggleMilestone, addDecision, addCheckIn,
     setCheckInFrequency, acknowledgeRecord, sendMessage, startConversation, markNotificationRead, markAllNotificationsRead,
     updateProfile, reportUser, reportOpportunity, submitAppeal]
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

