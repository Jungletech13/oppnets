import { supabase } from '@/lib/supabase';
import type { TrustAuditRecord, TrustEventLogEntry, TrustConfigEntry } from '@/types';

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
