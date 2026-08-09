import { supabase } from '@/lib/supabase';
import type {
  SubscriptionPlan,
  PlanEntitlements,
  UserSubscription,
  CompanySeatRecord,
  SeatAssignment,
  SubscriptionCostFactor,
  SubscriptionStatus,
  PlanVisibility,
  BillingInterval,
  PlanCategory,
  SeatRole,
} from '@/types';

// ============ Plans ============

export async function fetchPublicPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('active', true)
    .eq('visibility', 'public')
    .eq('approval_status', 'founder_approved')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data as SubscriptionPlan[]) ?? [];
}

export async function fetchAllPlans(): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as SubscriptionPlan[];
}

export async function fetchPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return data as SubscriptionPlan | null;
}

export async function fetchPlanById(id: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as SubscriptionPlan | null;
}

// ============ Entitlements ============

export async function fetchEntitlementsForPlan(planId: string): Promise<PlanEntitlements | null> {
  const { data, error } = await supabase
    .from('plan_entitlements')
    .select('*')
    .eq('plan_id', planId)
    .maybeSingle();
  if (error) throw error;
  return data as PlanEntitlements | null;
}

export async function fetchAllEntitlements(): Promise<PlanEntitlements[]> {
  const { data, error } = await supabase
    .from('plan_entitlements')
    .select('*, subscription_plans!inner(slug, name)')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as unknown as PlanEntitlements[];
}

// ============ User Subscriptions ============

export async function fetchMySubscription(): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .in('status', ['free', 'trial', 'active', 'past_due'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as UserSubscription | null;
}

export async function fetchAllSubscriptions(): Promise<UserSubscription[]> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as UserSubscription[];
}

export async function fetchMyPlanAndEntitlements(): Promise<{
  plan: SubscriptionPlan | null;
  entitlements: PlanEntitlements | null;
  subscription: UserSubscription | null;
}> {
  const sub = await fetchMySubscription();
  if (!sub) {
    const freePlan = await fetchPlanBySlug('builder-free');
    const freeEnt = freePlan ? await fetchEntitlementsForPlan(freePlan.id) : null;
    return { plan: freePlan, entitlements: freeEnt, subscription: null };
  }
  const [plan, entitlements] = await Promise.all([
    fetchPlanById(sub.plan_id),
    fetchEntitlementsForPlan(sub.plan_id),
  ]);
  return { plan, entitlements, subscription: sub };
}

// ============ Admin: Plan Management (via RPC) ============

export async function adminCreatePlan(input: {
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  billing_interval: BillingInterval;
  plan_category: PlanCategory;
  visibility: PlanVisibility;
  sort_order: number;
  reason?: string;
}): Promise<SubscriptionPlan> {
  const { data, error } = await supabase.rpc('admin_create_plan', {
    p_name: input.name,
    p_slug: input.slug,
    p_description: input.description,
    p_price_cents: input.price_cents,
    p_billing_interval: input.billing_interval,
    p_plan_category: input.plan_category,
    p_visibility: input.visibility,
    p_sort_order: input.sort_order,
    p_reason: input.reason ?? '',
  });
  if (error) throw error;
  return data as SubscriptionPlan;
}

export async function adminUpdatePlan(
  planId: string,
  updates: Partial<Pick<SubscriptionPlan, 'name' | 'description' | 'price_cents' | 'billing_interval' | 'plan_category' | 'active' | 'visibility' | 'sort_order' | 'approval_status'>>
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_plan', {
    p_plan_id: planId,
    p_updates: updates,
    p_reason: 'Updated plan configuration',
  });
  if (error) throw error;
}

export async function adminUpdateEntitlements(
  entitlementId: string,
  updates: Partial<PlanEntitlements>
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_entitlements', {
    p_entitlement_id: entitlementId,
    p_updates: updates,
    p_reason: 'Updated plan entitlements',
  });
  if (error) throw error;
}

// ============ Admin: Subscription Assignment (via RPC) ============

export async function adminAssignSubscription(
  userId: string,
  planId: string,
  status: SubscriptionStatus,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_assign_subscription', {
    p_user_id: userId,
    p_plan_id: planId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function adminUpdateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_subscription_status', {
    p_subscription_id: subscriptionId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw error;
}

// ============ Admin: Seat Management (via RPC) ============

export async function adminAssignSeat(
  companyId: string,
  userId: string,
  role: SeatRole,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_assign_seat', {
    p_company_id: companyId,
    p_user_id: userId,
    p_role: role,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function adminRemoveSeat(
  assignmentId: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_remove_seat', {
    p_assignment_id: assignmentId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function fetchSeatAssignments(companyId: string): Promise<SeatAssignment[]> {
  const { data, error } = await supabase
    .from('seat_assignments')
    .select('*')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('assigned_at', { ascending: false });
  if (error) throw error;
  return data as SeatAssignment[];
}

export async function fetchCompanySeats(companyId: string): Promise<CompanySeatRecord | null> {
  const { data, error } = await supabase
    .from('company_seats')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) throw error;
  return data as CompanySeatRecord | null;
}

// ============ Admin: Cost Factors (via RPC) ============

export async function fetchCostFactors(): Promise<SubscriptionCostFactor[]> {
  const { data, error } = await supabase
    .from('subscription_cost_factors')
    .select('*')
    .order('cost_category', { ascending: true });
  if (error) throw error;
  return data as SubscriptionCostFactor[];
}

export async function adminUpdateCostFactor(
  costFactorId: string,
  monthlyCostCents: number,
  description: string,
  reason: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_cost_factor', {
    p_cost_factor_id: costFactorId,
    p_monthly_cost_cents: monthlyCostCents,
    p_description: description,
    p_reason: reason,
  });
  if (error) throw error;
}

export interface UsageMetric { used?: number; limit: number; remaining?: number; reset_at?: string; }
export interface UsageLimits {
  plan_slug: string; active_opportunities: UsageMetric; ai_actions: UsageMetric;
  collaboration_spaces: UsageMetric; team_members: UsageMetric;
  messages_per_day: UsageMetric; storage_mb: UsageMetric;
}
export interface UsageResult extends UsageMetric { allowed: boolean; current: number; metric: string; }

export async function fetchMyUsageLimits(): Promise<UsageLimits> {
  const { data, error } = await supabase.rpc('get_my_usage_limits');
  if (error) throw error;
  return data as UsageLimits;
}

export async function consumeUsage(metric: 'ai_actions', amount = 1): Promise<UsageResult> {
  const { data, error } = await supabase.rpc('consume_usage', { p_metric_key: metric, p_amount: amount });
  if (error) throw error;
  return data as UsageResult;
}
