import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type {
  Profile,
  Opportunity,
  CollaborationSpace,
  Conversation,
  AppNotification,
  CollaborationGroup,
  Task,
  TaskStatus,
  Feedback,
  ID,
  WorkspaceModule,
  Milestone,
  Decision,
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
import { useAuth } from '@/lib/auth';
import {
  createOpportunity as persistOpportunity,
  createTask,
  fetchOpportunities,
  fetchProfiles,
  fetchUserSpacesWithDetails,
  fetchConversations,
  createDirectConversation,
  createSpaceConversation,
  updateCollaborationSpace,
  createMilestone as persistMilestone,
  updateMilestone as persistMilestoneUpdate,
  createDecision as persistDecision,
  acknowledgeCollaborationRecord,
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
import { isE2EMode } from '@/lib/runtime';
import { createEmptyTrustState } from '@/lib/trust-state';

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
  updateSpace: (spaceId: ID, updater: (s: CollaborationSpace) => CollaborationSpace) => Promise<void>;
  addTask: (spaceId: ID, task: Task) => Promise<void>;
  updateTask: (spaceId: ID, taskId: ID, updater: (t: Task) => Task) => Promise<void>;
  submitForReview: (spaceId: ID, taskId: ID) => Promise<void>;
  reviewTask: (spaceId: ID, taskId: ID, action: 'approve' | 'changes' | 'discussion', feedback?: Omit<Feedback, 'id' | 'at'>) => Promise<void>;
  toggleChecklistItem: (spaceId: ID, taskId: ID, itemId: ID) => Promise<void>;
  toggleChecklistReview: (spaceId: ID, taskId: ID, itemId: ID) => Promise<void>;
  updateModules: (spaceId: ID, modules: WorkspaceModule[]) => Promise<void>;
  addMilestone: (spaceId: ID, m: Milestone) => Promise<void>;
  toggleMilestone: (spaceId: ID, milestoneId: ID) => Promise<void>;
  addDecision: (spaceId: ID, d: Decision) => Promise<void>;
  setCheckInFrequency: (spaceId: ID, f: CheckInFrequency) => Promise<void>;
  acknowledgeRecord: (spaceId: ID) => Promise<void>;
  sendMessage: (convId: ID, text: string) => Promise<void>;
  startConversation: (participantIds: ID[], title: string, type?: Conversation['type'], spaceId?: ID, initialMessage?: string) => Promise<ID>;
  markNotificationRead: (id: ID) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updateProfile: (p: Profile) => Promise<void>;
  reportUser: (targetId: ID, reason: string) => Promise<void>;
  reportOpportunity: (targetId: ID, reason: string) => Promise<void>;
  submitAppeal: (decision: string, reason: string) => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

// The provider and hook intentionally share this module so they use one context.
// eslint-disable-next-line react-refresh/only-export-components
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

const errorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [route, setRoute] = useState<Route>(restoreRoute);
  const [profiles, setProfiles] = useState<Profile[]>(isE2EMode ? PROFILES : []);
  const [groups] = useState<CollaborationGroup[]>(isE2EMode ? GROUPS : []);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(isE2EMode ? OPPORTUNITIES : []);
  const [spaces, setSpaces] = useState<CollaborationSpace[]>(isE2EMode ? SPACES : []);
  const [conversations, setConversations] = useState<Conversation[]>(isE2EMode ? CONVERSATIONS : []);
  const [notifications, setNotifications] = useState<AppNotification[]>(isE2EMode ? NOTIFICATIONS : []);
  const [trust, setTrust] = useState<TrustState>(() => isE2EMode ? MY_TRUST : createEmptyTrustState());
  const [dataLoading, setDataLoading] = useState(!isE2EMode);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadVersion, setLoadVersion] = useState(0);
  const currentUserId = user?.id ?? '';

  useEffect(() => {
    if (isE2EMode) return;
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
        setDataError(errorMessage(error, 'Could not load your OppNets data.'));
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

  const replacePersistedSpace = useCallback((spaceId: ID, row: Record<string, unknown> | null) => {
    if (!row) throw new Error('Collaboration Space could not be reloaded.');
    const persistedSpace = mapSpaceRow(row);
    setSpaces((prev) => prev.map((space) => (space.id === spaceId ? persistedSpace : space)));
  }, []);

  const updateSpace = useCallback(async (spaceId: ID, updater: (s: CollaborationSpace) => CollaborationSpace) => {
    const current = spaces.find((space) => space.id === spaceId);
    if (!current) throw new Error('Collaboration Space not found.');
    const updated = updater(current);
    if (isE2EMode) {
      setSpaces((prev) => prev.map((space) => (space.id === spaceId ? updated : space)));
      return;
    }
    const changes: Record<string, unknown> = {};
    if (updated.notes !== current.notes) changes.notes = updated.notes;
    if (updated.modules !== current.modules) changes.modules = updated.modules;
    if (updated.checkInFrequency !== current.checkInFrequency) changes.check_in_frequency = updated.checkInFrequency;
    const row = await updateCollaborationSpace(spaceId, changes);
    replacePersistedSpace(spaceId, row as Record<string, unknown> | null);
  }, [spaces, replacePersistedSpace]);

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

  const updateModules = useCallback(async (spaceId: ID, modules: WorkspaceModule[]) => {
    await updateSpace(spaceId, (s) => ({ ...s, modules }));
  }, [updateSpace]);

  const addMilestone = useCallback(async (spaceId: ID, milestone: Milestone) => {
    if (isE2EMode) {
      setSpaces((prev) => prev.map((space) => space.id === spaceId ? { ...space, milestones: [...space.milestones, milestone] } : space));
      return;
    }
    const row = await persistMilestone(spaceId, milestone);
    replacePersistedSpace(spaceId, row as Record<string, unknown> | null);
  }, [replacePersistedSpace]);

  const toggleMilestone = useCallback(async (spaceId: ID, milestoneId: ID) => {
    const milestone = spaces.find((space) => space.id === spaceId)?.milestones.find((item) => item.id === milestoneId);
    if (!milestone) throw new Error('Milestone not found.');
    if (isE2EMode) {
      setSpaces((prev) => prev.map((space) => space.id === spaceId ? {
        ...space,
        milestones: space.milestones.map((item) => item.id === milestoneId ? { ...item, done: !item.done } : item),
      } : space));
      return;
    }
    const row = await persistMilestoneUpdate(spaceId, milestoneId, !milestone.done);
    replacePersistedSpace(spaceId, row as Record<string, unknown> | null);
  }, [spaces, replacePersistedSpace]);

  const addDecision = useCallback(async (spaceId: ID, decision: Decision) => {
    if (isE2EMode) {
      setSpaces((prev) => prev.map((space) => space.id === spaceId ? {
        ...space,
        decisions: [decision, ...space.decisions],
        record: { ...space.record, majorDecisions: [decision, ...space.record.majorDecisions] },
      } : space));
      return;
    }
    const row = await persistDecision(spaceId, decision);
    replacePersistedSpace(spaceId, row as Record<string, unknown> | null);
  }, [replacePersistedSpace]);

  const setCheckInFrequency = useCallback(async (spaceId: ID, f: CheckInFrequency) => {
    await updateSpace(spaceId, (s) => ({ ...s, checkInFrequency: f }));
  }, [updateSpace]);

  const acknowledgeRecord = useCallback(async (spaceId: ID) => {
    if (isE2EMode) {
      setSpaces((prev) => prev.map((space) => space.id === spaceId ? {
        ...space,
        record: {
          ...space.record,
          acknowledgments: space.record.acknowledgments.includes(currentUserId)
            ? space.record.acknowledgments
            : [...space.record.acknowledgments, currentUserId],
        },
      } : space));
      return;
    }
    const row = await acknowledgeCollaborationRecord(spaceId);
    replacePersistedSpace(spaceId, row as Record<string, unknown> | null);
  }, [currentUserId, replacePersistedSpace]);

  const sendMessage = useCallback(async (convId: ID, text: string) => {
    if (isE2EMode) {
      setConversations((prev) => prev.map((conversation) =>
        conversation.id === convId
          ? { ...conversation, messages: [...conversation.messages, { id: uid('msg'), authorId: currentUserId, text: text.trim(), at: nowISO() }] }
          : conversation
      ));
      return;
    }
    const row = await persistMessage(convId, text.trim());
    if (!row) throw new Error('Message could not be saved.');
    const message = { id: row.id as string, authorId: row.author_id as string, text: row.text as string, at: row.at as string };
    setConversations((prev) => prev.map((conversation) =>
      conversation.id === convId ? { ...conversation, messages: [...conversation.messages, message] } : conversation
    ));
  }, [currentUserId]);

  const startConversation = useCallback(async (participantIds: ID[], title: string, type: Conversation['type'] = 'direct', spaceId?: ID, initialMessage = ''): Promise<ID> => {
    if (!initialMessage.trim()) throw new Error('Message cannot be empty.');
    if (isE2EMode) {
      const id = uid('conv');
      const conversation: Conversation = {
        id, type, title, participantIds, spaceId,
        messages: [{ id: uid('msg'), authorId: currentUserId, text: initialMessage.trim(), at: nowISO() }],
      };
      setConversations((prev) => [conversation, ...prev]);
      return id;
    }
    let row;
    if (type === 'space' && spaceId) {
      row = await createSpaceConversation(spaceId, title, initialMessage);
    } else if (type === 'direct' && participantIds.length === 1) {
      row = await createDirectConversation(participantIds[0], title, initialMessage);
    } else {
      throw new Error('Unsupported conversation type.');
    }
    const conversation = mapConversationRow(row as Record<string, unknown>);
    setConversations((prev) => [conversation, ...prev.filter((item) => item.id !== conversation.id)]);
    return conversation.id;
  }, [currentUserId]);

  const markNotificationRead = useCallback(async (id: ID) => {
    if (!isE2EMode) await persistNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!isE2EMode) await persistAllNotificationsRead(currentUserId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [currentUserId]);

  const updateProfile = useCallback(async (p: Profile) => {
    if (!isE2EMode) await persistProfile(p.id, profileToUpdate(p));
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
      createOpportunity, updateSpace, addTask, updateTask, submitForReview, reviewTask,
      toggleChecklistItem, toggleChecklistReview, updateModules, addMilestone, toggleMilestone, addDecision,
      setCheckInFrequency, acknowledgeRecord, sendMessage, startConversation, markNotificationRead, markAllNotificationsRead,
      updateProfile, reportUser, reportOpportunity, submitAppeal,
    }),
    [route, navigate, currentUserId, profiles, groups, opportunities, spaces, conversations, notifications, trust,
     dataLoading, dataError, retryDataLoad,
     createOpportunity, updateSpace, addTask, updateTask, submitForReview, reviewTask,
     toggleChecklistItem, toggleChecklistReview, updateModules, addMilestone, toggleMilestone, addDecision,
     setCheckInFrequency, acknowledgeRecord, sendMessage, startConversation, markNotificationRead, markAllNotificationsRead,
     updateProfile, reportUser, reportOpportunity, submitAppeal]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
