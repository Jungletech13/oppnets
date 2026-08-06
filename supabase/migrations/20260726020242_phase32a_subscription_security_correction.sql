/*
# Phase 3.2A — Subscription Security Correction

## Purpose
Corrects all confirmed security and integrity findings from the Phase 3.2 audit.
No new product features. No Stripe, billing, or payment processing.

## Changes

### 1. Lock user_subscriptions
- Drop vulnerable INSERT/UPDATE policies that allowed self-assignment.
- New INSERT/UPDATE policies: admin-only (is_admin()).
- Ordinary users: SELECT own only. No INSERT, UPDATE, DELETE.

### 2. One current subscription per user
- Partial unique index: one row per user_id WHERE status IN ('free','trial','active','past_due').
- cancelled/expired rows may remain for history.

### 3. Structural draft approval gate
- Add approval_status column to subscription_plans ('draft','founder_approved','retired'), default 'draft'.
- Set all seeded plans to 'draft'.
- Public SELECT requires active=true, visibility='public', approval_status='founder_approved'.
- Entitlements public SELECT requires parent plan to be active+public+founder_approved.

### 4. Plan assignment validation
- RPC admin_assign_subscription checks approval_status='founder_approved' and active=true.
- Rejects draft, retired, or inactive plans at the database level.

### 5. Seat count integrity
- total_seats becomes a GENERATED column (included_seats + additional_seats).
- CHECK constraints: included_seats >= 0, additional_seats >= 0.
- Helper function is_company_member() replaces self-referential RLS.
- Seat assignment trigger prevents exceeding total_seats.
- seat_assignments INSERT/UPDATE require matching company_seats record + valid company subscription.

### 6. Server-side entitlement boundary
- No database changes. Code-level documentation added in entitlements.ts.

### 7. Atomic admin mutations
- 8 RPC functions replace separate client mutation + audit log calls.
- Each RPC: verifies is_admin(), validates inputs, performs mutation, writes audit log, returns result.
- All within a single transaction (Postgres function = automatic transaction).
- Fixed secure search_path.

### 8. Non-recursive seat RLS
- is_company_member(company_id) helper function replaces self-referential EXISTS.
- company_seats and seat_assignments SELECT policies use the helper.

## Tables Modified
- subscription_plans: + approval_status column, updated SELECT policies
- plan_entitlements: updated SELECT policy (founder_approved check)
- user_subscriptions: replaced INSERT/UPDATE policies, + partial unique index
- company_seats: total_seats generated, + CHECK constraints, updated SELECT policy
- seat_assignments: updated SELECT policy (non-recursive), + assignment trigger

## New Functions
- public.is_company_member(company_id uuid) RETURNS boolean
- public._admin_audit(...) — internal audit helper
- public.admin_create_plan(...)
- public.admin_update_plan(...)
- public.admin_update_entitlements(...)
- public.admin_assign_subscription(...)
- public.admin_update_subscription_status(...)
- public.admin_assign_seat(...)
- public.admin_remove_seat(...)
- public.admin_update_cost_factor(...)
- public.check_seat_capacity() — trigger function

## Security
- All RPCs verify is_admin() and use fixed search_path.
- No service-role secrets exposed.
- Ordinary users cannot self-assign plans, modify subscriptions, or assign seats.
*/

-- ============================================================
-- 1. LOCK USER SUBSCRIPTIONS
-- ============================================================

DROP POLICY IF EXISTS "subs_insert_admin" ON user_subscriptions;
DROP POLICY IF EXISTS "subs_update_own" ON user_subscriptions;

DROP POLICY IF EXISTS "subs_insert_admin_only" ON user_subscriptions;
CREATE POLICY "subs_insert_admin_only"
  ON user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "subs_update_admin_only" ON user_subscriptions;
CREATE POLICY "subs_update_admin_only"
  ON user_subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 2. ONE CURRENT SUBSCRIPTION PER USER
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_one_current
  ON user_subscriptions (user_id)
  WHERE status IN ('free', 'trial', 'active', 'past_due');

-- ============================================================
-- 3. STRUCTURAL DRAFT APPROVAL GATE
-- ============================================================

ALTER TABLE subscription_plans
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'draft'
  CHECK (approval_status IN ('draft', 'founder_approved', 'retired'));

UPDATE subscription_plans SET approval_status = 'draft';

DROP POLICY IF EXISTS "plans_select_public" ON subscription_plans;
DROP POLICY IF EXISTS "plans_select_public_approved" ON subscription_plans;
CREATE POLICY "plans_select_public_approved"
  ON subscription_plans FOR SELECT
  TO anon, authenticated
  USING (active = true AND visibility = 'public' AND approval_status = 'founder_approved');

DROP POLICY IF EXISTS "entitlements_select_public" ON plan_entitlements;
DROP POLICY IF EXISTS "entitlements_select_public_approved" ON plan_entitlements;
CREATE POLICY "entitlements_select_public_approved"
  ON plan_entitlements FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM subscription_plans p
    WHERE p.id = plan_entitlements.plan_id
    AND p.active = true
    AND p.visibility = 'public'
    AND p.approval_status = 'founder_approved'
  ));

-- ============================================================
-- 5. SEAT COUNT INTEGRITY
-- ============================================================

-- Non-recursive membership helper function
CREATE OR REPLACE FUNCTION public.is_company_member(check_company_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM seat_assignments sa
    WHERE sa.company_id = check_company_id
    AND sa.user_id = auth.uid()
    AND sa.active = true
  )
$$;

-- Replace total_seats with generated column
ALTER TABLE company_seats DROP COLUMN IF EXISTS total_seats;
ALTER TABLE company_seats
  ADD COLUMN total_seats integer GENERATED ALWAYS AS (included_seats + additional_seats) STORED;

-- Add non-negative constraints via DO block (ADD CONSTRAINT IF NOT EXISTS not supported)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_seats_included_nonneg'
  ) THEN
    ALTER TABLE company_seats ADD CONSTRAINT company_seats_included_nonneg CHECK (included_seats >= 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'company_seats_additional_nonneg'
  ) THEN
    ALTER TABLE company_seats ADD CONSTRAINT company_seats_additional_nonneg CHECK (additional_seats >= 0);
  END IF;
END $$;

-- Update company_seats SELECT policy (non-recursive)
DROP POLICY IF EXISTS "seats_select_member" ON company_seats;
DROP POLICY IF EXISTS "seats_select_member_nonrecursive" ON company_seats;
CREATE POLICY "seats_select_member_nonrecursive"
  ON company_seats FOR SELECT
  TO authenticated
  USING (public.is_admin() OR public.is_company_member(company_seats.company_id));

-- Update seat_assignments SELECT policy (non-recursive)
DROP POLICY IF EXISTS "seat_assign_select_member" ON seat_assignments;
DROP POLICY IF EXISTS "seat_assign_select_member_nonrecursive" ON seat_assignments;
CREATE POLICY "seat_assign_select_member_nonrecursive"
  ON seat_assignments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR public.is_company_member(seat_assignments.company_id)
  );

-- Trigger: validate seat capacity and company subscription on insert/update
CREATE OR REPLACE FUNCTION public.check_seat_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_seats integer;
  v_active_count integer;
  v_sub_status text;
  v_plan_category text;
  v_plan_approval text;
  v_plan_active boolean;
BEGIN
  SELECT cs.total_seats INTO v_total_seats
  FROM company_seats cs
  WHERE cs.company_id = NEW.company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No company_seats record found for company %. Seat assignment requires a matching company_seats record.', NEW.company_id;
  END IF;

  SELECT us.status, sp.plan_category, sp.approval_status, sp.active
  INTO v_sub_status, v_plan_category, v_plan_approval, v_plan_active
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  JOIN company_seats cs ON cs.subscription_id = us.id
  WHERE cs.company_id = NEW.company_id
  AND us.status IN ('active', 'trial')
  ORDER BY us.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No current company subscription found for company %. Seat assignment requires an active company subscription.', NEW.company_id;
  END IF;

  IF v_plan_category != 'company' THEN
    RAISE EXCEPTION 'Company % subscription is not a Company-category plan.', NEW.company_id;
  END IF;

  IF v_plan_approval != 'founder_approved' THEN
    RAISE EXCEPTION 'Company % plan is not founder_approved. Seat assignment rejected.', NEW.company_id;
  END IF;

  IF NOT v_plan_active THEN
    RAISE EXCEPTION 'Company % plan is not active.', NEW.company_id;
  END IF;

  IF NEW.active = true THEN
    SELECT count(*) INTO v_active_count
    FROM seat_assignments sa
    WHERE sa.company_id = NEW.company_id
    AND sa.active = true
    AND (TG_OP = 'UPDATE' OR sa.id != NEW.id);

    IF v_active_count >= v_total_seats THEN
      RAISE EXCEPTION 'Seat capacity exceeded for company %. Active seats: %, Total seats: %.', NEW.company_id, v_active_count, v_total_seats;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_seat_capacity ON seat_assignments;
CREATE TRIGGER trg_check_seat_capacity
  BEFORE INSERT OR UPDATE ON seat_assignments
  FOR EACH ROW EXECUTE FUNCTION public.check_seat_capacity();

-- ============================================================
-- 7. ATOMIC ADMIN MUTATION RPCs
-- ============================================================

-- Internal audit helper
CREATE OR REPLACE FUNCTION public._admin_audit(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_reason text DEFAULT '',
  p_previous_state jsonb DEFAULT NULL,
  p_new_state jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO admin_audit_log (action, target_type, target_id, reason, previous_state, new_state)
  VALUES (p_action, p_target_type, p_target_id, p_reason, p_previous_state, p_new_state);
$$;

-- 7a. admin_create_plan
CREATE OR REPLACE FUNCTION public.admin_create_plan(
  p_name text,
  p_slug text,
  p_description text,
  p_price_cents integer,
  p_billing_interval text,
  p_plan_category text,
  p_visibility text,
  p_sort_order integer,
  p_reason text DEFAULT ''
)
RETURNS subscription_plans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan subscription_plans;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  INSERT INTO subscription_plans (name, slug, description, price_cents, billing_interval, plan_category, visibility, active, sort_order, approval_status)
  VALUES (p_name, p_slug, p_description, p_price_cents, p_billing_interval, p_plan_category, p_visibility, true, p_sort_order, 'draft')
  RETURNING * INTO v_plan;

  PERFORM public._admin_audit('plan.create', 'subscription_plan', v_plan.id::text, p_reason, NULL, to_jsonb(v_plan));

  RETURN v_plan;
END;
$$;

-- 7b. admin_update_plan
CREATE OR REPLACE FUNCTION public.admin_update_plan(
  p_plan_id uuid,
  p_updates jsonb,
  p_reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prev subscription_plans;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT * INTO v_prev FROM subscription_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;

  UPDATE subscription_plans SET
    name = COALESCE(p_updates->>'name', name),
    description = COALESCE(p_updates->>'description', description),
    price_cents = COALESCE((p_updates->>'price_cents')::integer, price_cents),
    billing_interval = COALESCE(p_updates->>'billing_interval', billing_interval),
    plan_category = COALESCE(p_updates->>'plan_category', plan_category),
    active = COALESCE((p_updates->>'active')::boolean, active),
    visibility = COALESCE(p_updates->>'visibility', visibility),
    sort_order = COALESCE((p_updates->>'sort_order')::integer, sort_order),
    approval_status = COALESCE(p_updates->>'approval_status', approval_status),
    updated_at = now()
  WHERE id = p_plan_id;

  PERFORM public._admin_audit('plan.update', 'subscription_plan', p_plan_id::text, p_reason, to_jsonb(v_prev), p_updates);
END;
$$;

-- 7c. admin_update_entitlements
CREATE OR REPLACE FUNCTION public.admin_update_entitlements(
  p_entitlement_id uuid,
  p_updates jsonb,
  p_reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prev plan_entitlements;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT * INTO v_prev FROM plan_entitlements WHERE id = p_entitlement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entitlements not found: %', p_entitlement_id;
  END IF;

  UPDATE plan_entitlements SET
    max_opportunities = COALESCE((p_updates->>'max_opportunities')::integer, max_opportunities),
    max_applications = COALESCE((p_updates->>'max_applications')::integer, max_applications),
    max_saved_items = COALESCE((p_updates->>'max_saved_items')::integer, max_saved_items),
    max_collaboration_spaces = COALESCE((p_updates->>'max_collaboration_spaces')::integer, max_collaboration_spaces),
    max_team_members = COALESCE((p_updates->>'max_team_members')::integer, max_team_members),
    max_messages_per_day = COALESCE((p_updates->>'max_messages_per_day')::integer, max_messages_per_day),
    storage_limit_mb = COALESCE((p_updates->>'storage_limit_mb')::integer, storage_limit_mb),
    max_professional_listings = COALESCE((p_updates->>'max_professional_listings')::integer, max_professional_listings),
    max_company_pages = COALESCE((p_updates->>'max_company_pages')::integer, max_company_pages),
    ai_access = COALESCE((p_updates->>'ai_access')::boolean, ai_access),
    advanced_search = COALESCE((p_updates->>'advanced_search')::boolean, advanced_search),
    analytics_access = COALESCE((p_updates->>'analytics_access')::boolean, analytics_access),
    priority_visibility = COALESCE((p_updates->>'priority_visibility')::boolean, priority_visibility),
    sponsored_listing_access = COALESCE((p_updates->>'sponsored_listing_access')::boolean, sponsored_listing_access),
    recruiting_tools = COALESCE((p_updates->>'recruiting_tools')::boolean, recruiting_tools),
    marketing_tools = COALESCE((p_updates->>'marketing_tools')::boolean, marketing_tools),
    public_builder_profile = COALESCE((p_updates->>'public_builder_profile')::boolean, public_builder_profile),
    seo_profile = COALESCE((p_updates->>'seo_profile')::boolean, seo_profile),
    updated_at = now()
  WHERE id = p_entitlement_id;

  PERFORM public._admin_audit('entitlement.update', 'plan_entitlements', p_entitlement_id::text, p_reason, to_jsonb(v_prev), p_updates);
END;
$$;

-- 7d. admin_assign_subscription (with plan validation)
CREATE OR REPLACE FUNCTION public.admin_assign_subscription(
  p_user_id uuid,
  p_plan_id uuid,
  p_status text,
  p_reason text DEFAULT ''
)
RETURNS user_subscriptions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan subscription_plans;
  v_sub user_subscriptions;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT * INTO v_plan FROM subscription_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan_id;
  END IF;
  IF NOT v_plan.active THEN
    RAISE EXCEPTION 'Plan is not active: %', p_plan_id;
  END IF;
  IF v_plan.approval_status != 'founder_approved' THEN
    RAISE EXCEPTION 'Plan is not founder_approved (current: %). Assignment rejected.', v_plan.approval_status;
  END IF;

  INSERT INTO user_subscriptions (user_id, plan_id, status, started_at)
  VALUES (p_user_id, p_plan_id, p_status, now())
  RETURNING * INTO v_sub;

  PERFORM public._admin_audit('subscription.assign', 'user_subscription', v_sub.id::text, p_reason, NULL, to_jsonb(v_sub));

  RETURN v_sub;
END;
$$;

-- 7e. admin_update_subscription_status
CREATE OR REPLACE FUNCTION public.admin_update_subscription_status(
  p_subscription_id uuid,
  p_status text,
  p_reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prev user_subscriptions;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT * INTO v_prev FROM user_subscriptions WHERE id = p_subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found: %', p_subscription_id;
  END IF;

  UPDATE user_subscriptions SET status = p_status, updated_at = now()
  WHERE id = p_subscription_id;

  PERFORM public._admin_audit('subscription.status_change', 'user_subscription', p_subscription_id::text, p_reason, to_jsonb(v_prev), jsonb_build_object('status', p_status));
END;
$$;

-- 7f. admin_assign_seat (with capacity validation via trigger)
CREATE OR REPLACE FUNCTION public.admin_assign_seat(
  p_company_id uuid,
  p_user_id uuid,
  p_role text,
  p_reason text DEFAULT ''
)
RETURNS seat_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_assignment seat_assignments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  INSERT INTO seat_assignments (company_id, user_id, role, active, assigned_at)
  VALUES (p_company_id, p_user_id, p_role, true, now())
  RETURNING * INTO v_assignment;

  PERFORM public._admin_audit('seat.assign', 'seat_assignment', v_assignment.id::text, p_reason, NULL, to_jsonb(v_assignment));

  RETURN v_assignment;
END;
$$;

-- 7g. admin_remove_seat
CREATE OR REPLACE FUNCTION public.admin_remove_seat(
  p_assignment_id uuid,
  p_reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prev seat_assignments;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT * INTO v_prev FROM seat_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seat assignment not found: %', p_assignment_id;
  END IF;

  UPDATE seat_assignments SET active = false WHERE id = p_assignment_id;

  PERFORM public._admin_audit('seat.remove', 'seat_assignment', p_assignment_id::text, p_reason, to_jsonb(v_prev), jsonb_build_object('active', false));
END;
$$;

-- 7h. admin_update_cost_factor
CREATE OR REPLACE FUNCTION public.admin_update_cost_factor(
  p_cost_factor_id uuid,
  p_monthly_cost_cents integer,
  p_description text,
  p_reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prev subscription_cost_factors;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT * INTO v_prev FROM subscription_cost_factors WHERE id = p_cost_factor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cost factor not found: %', p_cost_factor_id;
  END IF;

  UPDATE subscription_cost_factors SET
    monthly_cost_cents = p_monthly_cost_cents,
    description = p_description,
    updated_at = now()
  WHERE id = p_cost_factor_id;

  PERFORM public._admin_audit('cost_factor.update', 'subscription_cost_factor', p_cost_factor_id::text, p_reason, to_jsonb(v_prev), jsonb_build_object('monthly_cost_cents', p_monthly_cost_cents, 'description', p_description));
END;
$$;

-- ============================================================
-- Ensure RLS is enabled on all tables
-- ============================================================
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_cost_factors ENABLE ROW LEVEL SECURITY;
