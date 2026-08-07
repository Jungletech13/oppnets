import { supabase } from '@/lib/supabase';
import type { TrustAuditRecord, TrustEventLogEntry, TrustConfigEntry, VerifiedCollaboration } from '@/types';

// ============ Trust Audit Records ============

export async function logTrustDecision(input: {
  actor_type?: 'admin' | 'system' | 'user';
  decision_type: string;
  target_type: string;
  target_id: string;
  reason?: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
}) {
  const { data, error } = await supabase
    .from('trust_audit_records')
    .insert({
      actor_type: input.actor_type ?? 'admin',
      decision_type: input.decision_type,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason ?? '',
      previous_state: input.previous_state ?? null,
      new_state: input.new_state ?? null,
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as TrustAuditRecord;
}

export async function fetchTrustAuditLog(limit = 100) {
  const { data, error } = await supabase
    .from('trust_audit_records')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as TrustAuditRecord[];
}

export async function fetchTrustAuditForTarget(targetType: string, targetId: string) {
  const { data, error } = await supabase
    .from('trust_audit_records')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as TrustAuditRecord[];
}

// ============ Trust Event Log ============

export async function fetchTrustEvents(limit = 100) {
  const { data, error } = await supabase
    .from('trust_event_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as TrustEventLogEntry[];
}

export async function fetchTrustEventsForUser(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('trust_event_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as TrustEventLogEntry[];
}

export async function fetchTrustEventsForTarget(targetType: string, targetId: string, limit = 50) {
  const { data, error } = await supabase
    .from('trust_event_log')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as TrustEventLogEntry[];
}

// ============ Trust Config ============

export async function fetchTrustConfig() {
  const { data, error } = await supabase
    .from('trust_config')
    .select('*')
    .order('key', { ascending: true });
  if (error) throw error;
  return data as TrustConfigEntry[];
}

export async function fetchTrustConfigValue(key: string) {
  const { data, error } = await supabase
    .from('trust_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value;
}

export async function updateTrustConfig(key: string, value: unknown, description?: string) {
  const { data, error } = await supabase
    .from('trust_config')
    .update({
      value,
      ...(description !== undefined ? { description } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as TrustConfigEntry;
}

// ============ Verified Collaborations ============

export async function fetchMyVerifiedCollaborations() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];
  const { data, error } = await supabase
    .from('verified_collaborations')
    .select('*')
    .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`)
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return data as VerifiedCollaboration[];
}

export async function fetchVerifiedCollaborationsForUser(userId: string) {
  const { data, error } = await supabase
    .from('verified_collaborations')
    .select('*')
    .or(`participant_one_id.eq.${userId},participant_two_id.eq.${userId}`)
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return data as VerifiedCollaboration[];
}

export async function fetchVerifiedCollaborationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('verified_collaborations')
    .select('id', { count: 'exact', head: true })
    .eq('verification_status', 'verified')
    .or(`participant_one_id.eq.${userId},participant_two_id.eq.${userId}`);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchVerifiedCollaborationsForSpace(spaceId: string) {
  const { data, error } = await supabase
    .from('verified_collaborations')
    .select('*')
    .eq('collaboration_space_id', spaceId)
    .order('generated_at', { ascending: false });
  if (error) throw error;
  return data as VerifiedCollaboration[];
}

export async function adminGenerateVerifiedCollaborations(spaceId: string) {
  const { data, error } = await supabase
    .rpc('admin_generate_verified_collaborations', { p_space_id: spaceId });
  if (error) throw error;
  return data;
}

export async function adminInvalidateVerifiedCollaboration(id: string, reason: string) {
  const { error } = await supabase
    .rpc('admin_invalidate_verified_collaboration', {
      p_verified_collaboration_id: id,
      p_reason: reason,
    });
  if (error) throw error;
}
