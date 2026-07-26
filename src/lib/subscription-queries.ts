import { supabase } from '@/lib/supabase';
import { logAdminAction } from '@/lib/admin-queries';
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
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data as SubscriptionPlan[];
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
    .order('created_at', { ascending: false })
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

// ============ Admin: Plan Management ============

export async function adminCreatePlan(input: {
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  billing_interval: BillingInterval;
  plan_category: PlanCategory;
  visibility: PlanVisibility;
  sort_order: number;
}): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description,
      price_cents: input.price_cents,
      billing_interval: input.billing_interval,
      plan_category: input.plan_category,
      visibility: input.visibility,
      active: true,
      sort_order: input.sort_order,
    })
    .select()
    .maybeSingle();
  if (error) throw error;

  await logAdminAction({
    action: 'plan.create',
    target_type: 'subscription_plan',
    target_id: data.id,
    reason: `Created plan: ${input.name}`,
    new_state: data,
  });

  return data as SubscriptionPlan;
}

export async function adminUpdatePlan(
  planId: string,
  updates: Partial<Pick<SubscriptionPlan, 'name' | 'description' | 'price_cents' | 'billing_interval' | 'plan_category' | 'active' | 'visibility' | 'sort_order'>>
): Promise<void> {
  const { data: prev } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  const { error } = await supabase
    .from('subscription_plans')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', planId);
  if (error) throw error;

  await logAdminAction({
    action: 'plan.update',
    target_type: 'subscription_plan',
    target_id: planId,
    reason: `Updated plan configuration`,
    previous_state: prev ?? null,
    new_state: updates as Record<string, unknown>,
  });
}

export async function adminUpdateEntitlements(
  entitlementId: string,
  updates: Partial<PlanEntitlements>
): Promise<void> {
  const { data: prev } = await supabase
    .from('plan_entitlements')
    .select('*')
    .eq('id', entitlementId)
    .maybeSingle();

  const { error } = await supabase
    .from('plan_entitlements')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', entitlementId);
  if (error) throw error;

  await logAdminAction({
    action: 'entitlement.update',
    target_type: 'plan_entitlements',
    target_id: entitlementId,
    reason: `Updated plan entitlements`,
    previous_state: prev ?? null,
    new_state: updates as Record<string, unknown>,
  });
}

// ============ Admin: Subscription Assignment ============

export async function adminAssignSubscription(
  userId: string,
  planId: string,
  status: SubscriptionStatus,
  reason: string
): Promise<void> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .insert({
      user_id: userId,
      plan_id: planId,
      status,
      started_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();
  if (error) throw error;

  await logAdminAction({
    action: 'subscription.assign',
    target_type: 'user_subscription',
    target_id: data.id,
    reason,
    new_state: data,
  });
}

export async function adminUpdateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus,
  reason: string
): Promise<void> {
  const { data: prev } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .maybeSingle();

  const { error } = await supabase
    .from('user_subscriptions')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId);
  if (error) throw error;

  await logAdminAction({
    action: 'subscription.status_change',
    target_type: 'user_subscription',
    target_id: subscriptionId,
    reason,
    previous_state: prev ?? null,
    new_state: { status },
  });
}

// ============ Admin: Seat Management ============

export async function adminAssignSeat(
  companyId: string,
  userId: string,
  role: SeatRole,
  reason: string
): Promise<void> {
  const { data, error } = await supabase
    .from('seat_assignments')
    .insert({
      company_id: companyId,
      user_id: userId,
      role,
      active: true,
    })
    .select()
    .maybeSingle();
  if (error) throw error;

  await logAdminAction({
    action: 'seat.assign',
    target_type: 'seat_assignment',
    target_id: data.id,
    reason,
    new_state: data,
  });
}

export async function adminRemoveSeat(
  assignmentId: string,
  reason: string
): Promise<void> {
  const { data: prev } = await supabase
    .from('seat_assignments')
    .select('*')
    .eq('id', assignmentId)
    .maybeSingle();

  const { error } = await supabase
    .from('seat_assignments')
    .update({ active: false })
    .eq('id', assignmentId);
  if (error) throw error;

  await logAdminAction({
    action: 'seat.remove',
    target_type: 'seat_assignment',
    target_id: assignmentId,
    reason,
    previous_state: prev ?? null,
    new_state: { active: false },
  });
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

// ============ Admin: Cost Factors ============

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
  const { data: prev } = await supabase
    .from('subscription_cost_factors')
    .select('*')
    .eq('id', costFactorId)
    .maybeSingle();

  const { error } = await supabase
    .from('subscription_cost_factors')
    .update({
      monthly_cost_cents: monthlyCostCents,
      description,
      updated_at: new Date().toISOString(),
    })
    .eq('id', costFactorId);
  if (error) throw error;

  await logAdminAction({
    action: 'cost_factor.update',
    target_type: 'subscription_cost_factor',
    target_id: costFactorId,
    reason,
    previous_state: prev ?? null,
    new_state: { monthly_cost_cents: monthlyCostCents, description },
  });
}
