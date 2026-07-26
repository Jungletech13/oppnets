/*
# Phase 3.2 — Subscription Foundation

## Purpose
Creates the database architecture for OppNets subscription plans, entitlements,
user subscriptions, and company seat-based licensing. Architecture only — no
payment processing, no Stripe, no billing. All pricing is DRAFT and configurable.

## New Tables (in creation order)
1. subscription_plans — plan definitions (admin-managed)
2. plan_entitlements — configurable limits and feature flags per plan
3. user_subscriptions — user plan assignment
4. seat_assignments — users assigned to company seats (created before company_seats)
5. company_seats — purchased/included seats for company plans
6. subscription_cost_factors — future unit economics fields (admin-only)

## Security
- RLS enabled on all tables.
- subscription_plans: public read (active+public), admin read all, admin write.
- plan_entitlements: public read (for public plans), admin read all, admin write.
- user_subscriptions: users read/update own, admin read all, admin insert.
- seat_assignments: company members read own, admin write.
- company_seats: company members read own, admin write.
- subscription_cost_factors: admin-only.
- All admin checks use is_admin() from Phase 3.1.
*/

-- ============================================================
-- Table: subscription_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL DEFAULT '',
  price_cents integer NOT NULL DEFAULT 0,
  billing_interval text NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly')),
  plan_category text NOT NULL CHECK (plan_category IN ('builder_free', 'builder_pro', 'professional', 'company')),
  active boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'hidden')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select_public" ON subscription_plans;
CREATE POLICY "plans_select_public" ON subscription_plans
  FOR SELECT TO anon, authenticated
  USING (active = true AND visibility = 'public');

DROP POLICY IF EXISTS "plans_select_admin" ON subscription_plans;
CREATE POLICY "plans_select_admin" ON subscription_plans
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "plans_insert_admin" ON subscription_plans;
CREATE POLICY "plans_insert_admin" ON subscription_plans
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "plans_update_admin" ON subscription_plans;
CREATE POLICY "plans_update_admin" ON subscription_plans
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "plans_delete_admin" ON subscription_plans;
CREATE POLICY "plans_delete_admin" ON subscription_plans
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- Table: plan_entitlements
-- ============================================================
CREATE TABLE IF NOT EXISTS plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  max_opportunities integer NOT NULL DEFAULT 5,
  max_applications integer NOT NULL DEFAULT 10,
  max_saved_items integer NOT NULL DEFAULT 25,
  max_collaboration_spaces integer NOT NULL DEFAULT 3,
  max_team_members integer NOT NULL DEFAULT 5,
  max_messages_per_day integer NOT NULL DEFAULT 50,
  storage_limit_mb integer NOT NULL DEFAULT 100,
  max_professional_listings integer NOT NULL DEFAULT 0,
  max_company_pages integer NOT NULL DEFAULT 0,
  ai_access boolean NOT NULL DEFAULT false,
  advanced_search boolean NOT NULL DEFAULT false,
  analytics_access boolean NOT NULL DEFAULT false,
  priority_visibility boolean NOT NULL DEFAULT false,
  sponsored_listing_access boolean NOT NULL DEFAULT false,
  recruiting_tools boolean NOT NULL DEFAULT false,
  marketing_tools boolean NOT NULL DEFAULT false,
  public_builder_profile boolean NOT NULL DEFAULT false,
  seo_profile boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entitlements_select_public" ON plan_entitlements;
CREATE POLICY "entitlements_select_public" ON plan_entitlements
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM subscription_plans p
    WHERE p.id = plan_entitlements.plan_id
    AND p.active = true AND p.visibility = 'public'
  ));

DROP POLICY IF EXISTS "entitlements_select_admin" ON plan_entitlements;
CREATE POLICY "entitlements_select_admin" ON plan_entitlements
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "entitlements_insert_admin" ON plan_entitlements;
CREATE POLICY "entitlements_insert_admin" ON plan_entitlements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "entitlements_update_admin" ON plan_entitlements;
CREATE POLICY "entitlements_update_admin" ON plan_entitlements
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "entitlements_delete_admin" ON plan_entitlements;
CREATE POLICY "entitlements_delete_admin" ON plan_entitlements
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- Table: user_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'trial', 'active', 'past_due', 'cancelled', 'expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subs_select_own" ON user_subscriptions;
CREATE POLICY "subs_select_own" ON user_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "subs_insert_admin" ON user_subscriptions;
CREATE POLICY "subs_insert_admin" ON user_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "subs_update_own" ON user_subscriptions;
CREATE POLICY "subs_update_own" ON user_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "subs_delete_admin" ON user_subscriptions;
CREATE POLICY "subs_delete_admin" ON user_subscriptions
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions (status);

-- ============================================================
-- Table: seat_assignments (created before company_seats)
-- ============================================================
CREATE TABLE IF NOT EXISTS seat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'administrator', 'recruiter', 'manager', 'team_member', 'billing_manager')),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true
);

ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seat_assign_select_member" ON seat_assignments;
CREATE POLICY "seat_assign_select_member" ON seat_assignments
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM seat_assignments sa2
      WHERE sa2.company_id = seat_assignments.company_id
      AND sa2.user_id = auth.uid()
      AND sa2.active = true
    )
  );

DROP POLICY IF EXISTS "seat_assign_insert_admin" ON seat_assignments;
CREATE POLICY "seat_assign_insert_admin" ON seat_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "seat_assign_update_admin" ON seat_assignments;
CREATE POLICY "seat_assign_update_admin" ON seat_assignments
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "seat_assign_delete_admin" ON seat_assignments;
CREATE POLICY "seat_assign_delete_admin" ON seat_assignments
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_seat_assignments_company_id ON seat_assignments (company_id);
CREATE INDEX IF NOT EXISTS idx_seat_assignments_user_id ON seat_assignments (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seat_assignments_company_user_active ON seat_assignments (company_id, user_id) WHERE active = true;

-- ============================================================
-- Table: company_seats (references seat_assignments in RLS)
-- ============================================================
CREATE TABLE IF NOT EXISTS company_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
  included_seats integer NOT NULL DEFAULT 0,
  additional_seats integer NOT NULL DEFAULT 0,
  total_seats integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_seats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seats_select_member" ON company_seats;
CREATE POLICY "seats_select_member" ON company_seats
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM seat_assignments sa
      WHERE sa.company_id = company_seats.company_id
      AND sa.user_id = auth.uid()
      AND sa.active = true
    )
  );

DROP POLICY IF EXISTS "seats_insert_admin" ON company_seats;
CREATE POLICY "seats_insert_admin" ON company_seats
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "seats_update_admin" ON company_seats;
CREATE POLICY "seats_update_admin" ON company_seats
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "seats_delete_admin" ON company_seats;
CREATE POLICY "seats_delete_admin" ON company_seats
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_company_seats_company_id ON company_seats (company_id);

-- ============================================================
-- Table: subscription_cost_factors
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_cost_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_category text NOT NULL CHECK (cost_category IN ('infrastructure', 'ai', 'storage', 'email', 'support')),
  monthly_cost_cents integer NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_cost_factors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cost_factors_select_admin" ON subscription_cost_factors;
CREATE POLICY "cost_factors_select_admin" ON subscription_cost_factors
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "cost_factors_insert_admin" ON subscription_cost_factors;
CREATE POLICY "cost_factors_insert_admin" ON subscription_cost_factors
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cost_factors_update_admin" ON subscription_cost_factors;
CREATE POLICY "cost_factors_update_admin" ON subscription_cost_factors
  FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "cost_factors_delete_admin" ON subscription_cost_factors;
CREATE POLICY "cost_factors_delete_admin" ON subscription_cost_factors
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ============================================================
-- Seed: Draft Plans (DRAFT — NOT FOUNDER APPROVED)
-- ============================================================
INSERT INTO subscription_plans (name, slug, description, price_cents, billing_interval, plan_category, active, visibility, sort_order)
VALUES
  ('Builder Free', 'builder-free', 'Core networking and collaboration tools for every builder.', 0, 'monthly', 'builder_free', true, 'public', 1),
  ('Builder Pro', 'builder-pro', 'AI-powered tools and advanced visibility for serious builders.', 1900, 'monthly', 'builder_pro', true, 'public', 2),
  ('Professional', 'professional', 'For service providers who want to grow their client base.', 4900, 'monthly', 'professional', true, 'public', 3),
  ('Company', 'company', 'For companies building teams and posting opportunities at scale.', 9900, 'monthly', 'company', true, 'public', 4)
ON CONFLICT (slug) DO NOTHING;

-- Seed entitlements for each plan
INSERT INTO plan_entitlements (plan_id, max_opportunities, max_applications, max_saved_items, max_collaboration_spaces, max_team_members, max_messages_per_day, storage_limit_mb, max_professional_listings, max_company_pages, ai_access, advanced_search, analytics_access, priority_visibility, sponsored_listing_access, recruiting_tools, marketing_tools, public_builder_profile, seo_profile)
SELECT p.id,
  CASE p.slug
    WHEN 'builder-free' THEN 5
    WHEN 'builder-pro' THEN 25
    WHEN 'professional' THEN 10
    WHEN 'company' THEN 50
  END,
  CASE p.slug
    WHEN 'builder-free' THEN 10
    WHEN 'builder-pro' THEN 50
    WHEN 'professional' THEN 25
    WHEN 'company' THEN 100
  END,
  CASE p.slug
    WHEN 'builder-free' THEN 25
    WHEN 'builder-pro' THEN 100
    WHEN 'professional' THEN 50
    WHEN 'company' THEN 200
  END,
  CASE p.slug
    WHEN 'builder-free' THEN 3
    WHEN 'builder-pro' THEN 10
    WHEN 'professional' THEN 5
    WHEN 'company' THEN 25
  END,
  CASE p.slug
    WHEN 'builder-free' THEN 5
    WHEN 'builder-pro' THEN 15
    WHEN 'professional' THEN 10
    WHEN 'company' THEN 50
  END,
  CASE p.slug
    WHEN 'builder-free' THEN 50
    WHEN 'builder-pro' THEN 200
    WHEN 'professional' THEN 100
    WHEN 'company' THEN 500
  END,
  CASE p.slug
    WHEN 'builder-free' THEN 100
    WHEN 'builder-pro' THEN 1000
    WHEN 'professional' THEN 500
    WHEN 'company' THEN 5000
  END,
  CASE p.slug
    WHEN 'builder-free' THEN 0
    WHEN 'builder-pro' THEN 0
    WHEN 'professional' THEN 1
    WHEN 'company' THEN 0
  END,
  CASE p.slug
    WHEN 'builder-free' THEN 0
    WHEN 'builder-pro' THEN 0
    WHEN 'professional' THEN 0
    WHEN 'company' THEN 1
  END,
  p.slug = 'builder-pro',
  p.slug IN ('builder-pro', 'professional', 'company'),
  p.slug IN ('builder-pro', 'professional', 'company'),
  p.slug IN ('builder-pro', 'professional', 'company'),
  p.slug IN ('professional', 'company'),
  p.slug = 'company',
  p.slug = 'company',
  p.slug IN ('builder-pro', 'professional', 'company'),
  p.slug IN ('builder-pro', 'professional', 'company')
FROM subscription_plans p
WHERE NOT EXISTS (SELECT 1 FROM plan_entitlements e WHERE e.plan_id = p.id);

-- Seed cost factors (DRAFT — NOT FOUNDER APPROVED)
INSERT INTO subscription_cost_factors (cost_category, monthly_cost_cents, description)
VALUES
  ('infrastructure', 2000, 'DRAFT — Supabase, hosting, CDN baseline cost'),
  ('ai', 500, 'DRAFT — AI API calls estimate (Builder Pro users)'),
  ('storage', 200, 'DRAFT — File storage for collaboration spaces'),
  ('email', 100, 'DRAFT — Transactional email cost'),
  ('support', 300, 'DRAFT — Support tooling and overhead')
ON CONFLICT DO NOTHING;
