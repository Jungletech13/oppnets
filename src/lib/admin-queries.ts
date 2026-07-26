import { supabase } from '@/lib/supabase';

// ============ Audit Log ============

export interface AdminAuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  created_at: string;
}

export async function logAdminAction(input: {
  action: string;
  target_type: string;
  target_id: string;
  reason?: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
}) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .insert({
      action: input.action,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason ?? '',
      previous_state: input.previous_state ?? null,
      new_state: input.new_state ?? null,
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchAuditLog(limit = 100) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as AdminAuditLogEntry[];
}

export async function fetchAuditLogForTarget(targetType: string, targetId: string) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as AdminAuditLogEntry[];
}

// ============ Admin Notes ============

export interface AdminNote {
  id: string;
  admin_id: string;
  target_type: string;
  target_id: string;
  note: string;
  created_at: string;
}

export async function addAdminNote(targetType: string, targetId: string, note: string) {
  const { data, error } = await supabase
    .from('admin_notes')
    .insert({ target_type: targetType, target_id: targetId, note })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchAdminNotes(targetType: string, targetId: string) {
  const { data, error } = await supabase
    .from('admin_notes')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as AdminNote[];
}

// ============ Platform Overview ============

export interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  opportunities: number;
  collaborationSpaces: number;
  professionals: number;
  companies: number;
  applications: number;
  messages: number;
  pendingVerifications: number;
  pendingReports: number;
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const [profiles, spaces, profs, cos, apps, msgs, verifications, reports] = await Promise.all([
    supabase.from('profiles').select('id, created_at', { count: 'exact', head: false }),
    supabase.from('collaboration_spaces').select('id', { count: 'exact', head: true }),
    supabase.from('professionals').select('id', { count: 'exact', head: true }),
    supabase.from('companies').select('id', { count: 'exact', head: true }),
    supabase.from('opportunity_applications').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
    supabase.from('verification_claims').select('id', { count: 'exact', head: true }).eq('state', 'pending'),
    supabase.from('fraud_alerts').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeCount = (profiles.data ?? []).filter(
    (p: { created_at?: string }) => p.created_at && new Date(p.created_at) >= thirtyDaysAgo
  ).length;

  return {
    totalUsers: profiles.count ?? 0,
    activeUsers: activeCount,
    opportunities: 0,
    collaborationSpaces: spaces.count ?? 0,
    professionals: profs.count ?? 0,
    companies: cos.count ?? 0,
    applications: apps.count ?? 0,
    messages: msgs.count ?? 0,
    pendingVerifications: verifications.count ?? 0,
    pendingReports: reports.count ?? 0,
  };
}

// ============ User Management ============

export interface AdminUserRow {
  id: string;
  name: string;
  headline: string;
  location: string;
  community_standing: string;
  created_at: string;
  email?: string;
}

export async function fetchAdminUsers(search?: string) {
  let query = supabase
    .from('profiles')
    .select('id, name, headline, location, community_standing, created_at')
    .order('created_at', { ascending: false });
  if (search && search.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,headline.ilike.%${search.trim()}%`);
  }
  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data as AdminUserRow[];
}

export async function fetchUserDetail(userId: string) {
  const [profile, verifications, fraudAlerts, reviews, auditLog, notes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('verification_claims').select('*').eq('user_id', userId).order('verified_at', { ascending: true }),
    supabase.from('fraud_alerts').select('*').eq('user_id', userId).order('detected_at', { ascending: false }),
    supabase.from('collaboration_reviews').select('*').eq('reviewer_id', userId).order('at', { ascending: false }).limit(20),
    fetchAuditLogForTarget('user', userId),
    fetchAdminNotes('user', userId),
  ]);

  return {
    profile: profile.data,
    verifications: verifications.data ?? [],
    fraudAlerts: fraudAlerts.data ?? [],
    reviews: reviews.data ?? [],
    auditLog,
    notes: notes,
  };
}

export async function suspendUser(userId: string, reason: string) {
  const { data: prev } = await supabase
    .from('profiles')
    .select('community_standing')
    .eq('id', userId)
    .maybeSingle();

  const { error } = await supabase
    .from('profiles')
    .update({ community_standing: 'monitoring' })
    .eq('id', userId);
  if (error) throw error;

  await logAdminAction({
    action: 'user.suspend',
    target_type: 'user',
    target_id: userId,
    reason,
    previous_state: prev ?? null,
    new_state: { community_standing: 'monitoring' },
  });
}

export async function restoreUser(userId: string, reason: string) {
  const { data: prev } = await supabase
    .from('profiles')
    .select('community_standing')
    .eq('id', userId)
    .maybeSingle();

  const { error } = await supabase
    .from('profiles')
    .update({ community_standing: 'neutral' })
    .eq('id', userId);
  if (error) throw error;

  await logAdminAction({
    action: 'user.restore',
    target_type: 'user',
    target_id: userId,
    reason,
    previous_state: prev ?? null,
    new_state: { community_standing: 'neutral' },
  });
}

// ============ Verification Center ============

export interface VerificationClaimRow {
  id: string;
  user_id: string;
  type: string;
  label: string;
  detail: string;
  state: string;
  verified_at: string | null;
}

export async function fetchVerificationQueue(state?: string) {
  let query = supabase
    .from('verification_claims')
    .select('*')
    .order('verified_at', { ascending: true });
  if (state && state !== 'all') {
    query = query.eq('state', state);
  }
  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data as VerificationClaimRow[];
}

export async function approveVerification(claimId: string, reason: string) {
  const { data: prev } = await supabase
    .from('verification_claims')
    .select('*')
    .eq('id', claimId)
    .maybeSingle();

  const { error } = await supabase
    .from('verification_claims')
    .update({ state: 'verified', verified_at: new Date().toISOString().slice(0, 10) })
    .eq('id', claimId);
  if (error) throw error;

  await logAdminAction({
    action: 'verification.approve',
    target_type: 'verification_claim',
    target_id: claimId,
    reason,
    previous_state: prev ?? null,
    new_state: { state: 'verified' },
  });
}

export async function rejectVerification(claimId: string, reason: string) {
  const { data: prev } = await supabase
    .from('verification_claims')
    .select('*')
    .eq('id', claimId)
    .maybeSingle();

  const { error } = await supabase
    .from('verification_claims')
    .update({ state: 'failed' })
    .eq('id', claimId);
  if (error) throw error;

  await logAdminAction({
    action: 'verification.reject',
    target_type: 'verification_claim',
    target_id: claimId,
    reason,
    previous_state: prev ?? null,
    new_state: { state: 'failed' },
  });
}

// ============ Moderation Center ============

export interface FraudAlertRow {
  id: string;
  user_id: string;
  type: string;
  severity: string;
  description: string;
  status: string;
  detected_at: string;
}

export async function fetchFraudAlerts(status?: string) {
  let query = supabase
    .from('fraud_alerts')
    .select('*')
    .order('detected_at', { ascending: false });
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  const { data, error } = await query.limit(200);
  if (error) throw error;
  return data as FraudAlertRow[];
}

export async function resolveFraudAlert(alertId: string, reason: string) {
  const { data: prev } = await supabase
    .from('fraud_alerts')
    .select('*')
    .eq('id', alertId)
    .maybeSingle();

  const { error } = await supabase
    .from('fraud_alerts')
    .update({ status: 'resolved' })
    .eq('id', alertId);
  if (error) throw error;

  await logAdminAction({
    action: 'fraud.resolve',
    target_type: 'fraud_alert',
    target_id: alertId,
    reason,
    previous_state: prev ?? null,
    new_state: { status: 'resolved' },
  });
}

export async function dismissFraudAlert(alertId: string, reason: string) {
  const { data: prev } = await supabase
    .from('fraud_alerts')
    .select('*')
    .eq('id', alertId)
    .maybeSingle();

  const { error } = await supabase
    .from('fraud_alerts')
    .update({ status: 'dismissed' })
    .eq('id', alertId);
  if (error) throw error;

  await logAdminAction({
    action: 'fraud.dismiss',
    target_type: 'fraud_alert',
    target_id: alertId,
    reason,
    previous_state: prev ?? null,
    new_state: { status: 'dismissed' },
  });
}

export async function escalateFraudAlert(alertId: string, reason: string) {
  const { data: prev } = await supabase
    .from('fraud_alerts')
    .select('*')
    .eq('id', alertId)
    .maybeSingle();

  const { error } = await supabase
    .from('fraud_alerts')
    .update({ status: 'escalated' })
    .eq('id', alertId);
  if (error) throw error;

  await logAdminAction({
    action: 'fraud.escalate',
    target_type: 'fraud_alert',
    target_id: alertId,
    reason,
    previous_state: prev ?? null,
    new_state: { status: 'escalated' },
  });
}

// ============ Collaboration Oversight ============

export interface AdminSpaceRow {
  id: string;
  name: string;
  description: string;
  opportunity_id: string;
  created_at: string;
}

export async function fetchAdminSpaces() {
  const { data, error } = await supabase
    .from('collaboration_spaces')
    .select('id, name, description, opportunity_id, created_at')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data as AdminSpaceRow[];
}

export async function fetchSpaceOverview(spaceId: string) {
  const [space, members, tasks, milestones, decisions, activity, auditLog] = await Promise.all([
    supabase.from('collaboration_spaces').select('*').eq('id', spaceId).maybeSingle(),
    supabase.from('space_members').select('*').eq('space_id', spaceId),
    supabase.from('tasks').select('*').eq('space_id', spaceId).order('created_at', { ascending: false }),
    supabase.from('milestones').select('*').eq('space_id', spaceId).order('due_date', { ascending: true }),
    supabase.from('decisions').select('*').eq('space_id', spaceId).order('decided_at', { ascending: false }),
    supabase.from('activity_log').select('*').eq('space_id', spaceId).order('at', { ascending: false }).limit(50),
    fetchAuditLogForTarget('space', spaceId),
  ]);

  return {
    space: space.data,
    members: members.data ?? [],
    tasks: tasks.data ?? [],
    milestones: milestones.data ?? [],
    decisions: decisions.data ?? [],
    activity: activity.data ?? [],
    auditLog,
  };
}

// ============ Recent Activity ============

export async function fetchRecentActivity() {
  const [recentUsers, recentVerifications, recentReports, recentAudit] = await Promise.all([
    supabase.from('profiles').select('id, name, created_at').order('created_at', { ascending: false }).limit(10),
    supabase.from('verification_claims').select('id, type, label, state, verified_at').eq('state', 'pending').order('verified_at', { ascending: true }).limit(10),
    supabase.from('fraud_alerts').select('id, type, severity, status, detected_at').eq('status', 'open').order('detected_at', { ascending: false }).limit(10),
    fetchAuditLog(15),
  ]);

  return {
    recentUsers: recentUsers.data ?? [],
    recentVerifications: recentVerifications.data ?? [],
    recentReports: recentReports.data ?? [],
    recentAudit,
  };
}
