/*
# Phase 3A — Subscription & Entitlement Architecture

## Overview
Creates the database tables for a configurable subscription and entitlement system.
Plans, their limits/features/flags, and user subscriptions are all stored in the
database so administrators can change pricing and limits without code changes.
Stripe is NOT integrated — subscription states are placeholder values only.

## New Tables (3)

1. **subscription_plans** — One row per plan tier (builder_free, builder_pro,
   professional, company, and any future plans). Stores:
   - tier (unique key, e.g. 'builder_free')
   - name, description, price_cents, currency, billing_period
   - is_active (can be toggled to hide a plan from signup)
   - sort_order (display ordering)
   - created_at, updated_at

2. **plan_entitlements** — Key-value configuration for every plan. Each row is one
   configurable limit or feature flag for one plan. Stores:
   - plan_tier (FK -> subscription_plans.tier, cascade delete)
   - key (e.g. 'max_opportunities', 'can_use_ai', 'max_team_members')
   - value (text — stores numbers as strings, booleans as 'true'/'false')
   - label (human-readable label for admin UI)
   - category (grouping: 'limits', 'features', 'visibility')
   - sort_order
   - UNIQUE(plan_tier, key)

3. **user_subscriptions** — One row per user's current subscription state. Stores:
   - user_id (FK -> profiles.id, cascade delete, unique — one subscription per user)
   - plan_tier (FK -> subscription_plans.tier)
   - status ('free' | 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'pending')
   - trial_ends_at, current_period_start, current_period_end (timestamptz, nullable)
   - cancelled_at (timestamptz, nullable)
   - created_at, updated_at

## Security
- subscription_plans: public read (all authenticated users can see available plans),
  admin-only write (insert/update/delete).
- plan_entitlements: public read, admin-only write.
- user_subscriptions: users can read their own subscription;
 admin can read all;

  users can insert/update their own (for self-serve plan selection in demo mode).
- Admin access uses the is_admin() function from the Phase 3 migration.

## Important Notes
1. Plan tiers use the same string values as the existing PlanTier type
   ('builder-free' etc. use hyphens in TypeScript but Postgres keys use underscores
   — the migration inserts seed data with hyphenated tier values to match).
2. All limits are stored as text in plan_entitlements.value;
 the frontend entitlement
   engine parses them to numbers or booleans.
3. No Stripe integration — subscription status values are placeholders.
4. Seed data inserts all 4 plans with their full entitlement configurations.
*/

-- ============ TABLES ============

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  tier text PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  price_cents int NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  billing_period text NOT NULL DEFAULT 'month' CHECK (billing_period IN ('forever', 'month', 'year')),
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;


-- Plan entitlements (key-value config per plan)
CREATE TABLE IF NOT EXISTS plan_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier text NOT NULL REFERENCES subscription_plans(tier) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  label text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'limits' CHECK (category IN ('limits', 'features', 'visibility')),
  sort_order int NOT NULL DEFAULT 0,
  UNIQUE (plan_tier, key)
);

ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;


-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  plan_tier text NOT NULL REFERENCES subscription_plans(tier),
  status text NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'trial', 'active', 'past_due', 'cancelled', 'expired', 'pending')),
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;


-- ============ RLS POLICIES ============

-- Subscription plans: public read, admin write
DROP POLICY IF EXISTS "select_all_subscription_plans" ON subscription_plans;

CREATE POLICY "select_all_subscription_plans" ON subscription_plans FOR SELECT
  TO authenticated USING (true);


DROP POLICY IF EXISTS "insert_admin_subscription_plans" ON subscription_plans;

CREATE POLICY "insert_admin_subscription_plans" ON subscription_plans FOR INSERT
  TO authenticated WITH CHECK (is_admin());


DROP POLICY IF EXISTS "update_admin_subscription_plans" ON subscription_plans;

CREATE POLICY "update_admin_subscription_plans" ON subscription_plans FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());


DROP POLICY IF EXISTS "delete_admin_subscription_plans" ON subscription_plans;

CREATE POLICY "delete_admin_subscription_plans" ON subscription_plans FOR DELETE
  TO authenticated USING (is_admin());


-- Plan entitlements: public read, admin write
DROP POLICY IF EXISTS "select_all_plan_entitlements" ON plan_entitlements;

CREATE POLICY "select_all_plan_entitlements" ON plan_entitlements FOR SELECT
  TO authenticated USING (true);


DROP POLICY IF EXISTS "insert_admin_plan_entitlements" ON plan_entitlements;

CREATE POLICY "insert_admin_plan_entitlements" ON plan_entitlements FOR INSERT
  TO authenticated WITH CHECK (is_admin());


DROP POLICY IF EXISTS "update_admin_plan_entitlements" ON plan_entitlements;

CREATE POLICY "update_admin_plan_entitlements" ON plan_entitlements FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());


DROP POLICY IF EXISTS "delete_admin_plan_entitlements" ON plan_entitlements;

CREATE POLICY "delete_admin_plan_entitlements" ON plan_entitlements FOR DELETE
  TO authenticated USING (is_admin());


-- User subscriptions: users read/update own, admin reads all
DROP POLICY IF EXISTS "select_own_subscription" ON user_subscriptions;

CREATE POLICY "select_own_subscription" ON user_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_admin());


DROP POLICY IF EXISTS "insert_own_subscription" ON user_subscriptions;

CREATE POLICY "insert_own_subscription" ON user_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);


DROP POLICY IF EXISTS "update_own_subscription" ON user_subscriptions;

CREATE POLICY "update_own_subscription" ON user_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id OR is_admin()) WITH CHECK (auth.uid() = user_id OR is_admin());


-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_tier ON plan_entitlements(plan_tier);

CREATE INDEX IF NOT EXISTS idx_plan_entitlements_category ON plan_entitlements(category);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);


-- ============ SEED DATA: PLANS ============

INSERT INTO subscription_plans (tier, name, description, price_cents, currency, billing_period, is_active, sort_order) VALUES
  ('builder-free', 'Builder Free', 'Core networking and collaboration tools for every builder.', 0, 'USD', 'forever', true, 0),
  ('builder-pro', 'Builder Pro', 'AI-powered tools and advanced visibility for serious builders.', 1900, 'USD', 'month', true, 1),
  ('professional', 'Professional', 'For service providers who want to grow their client base.', 4900, 'USD', 'month', true, 2),
  ('company', 'Company', 'For companies building teams and posting opportunities at scale.', 9900, 'USD', 'month', true, 3)
ON CONFLICT (tier) DO NOTHING;


-- ============ SEED DATA: ENTITLEMENTS ============

-- Helper: insert entitlements for a plan
-- Format: (plan_tier, key, value, label, category, sort_order)

INSERT INTO plan_entitlements (plan_tier, key, value, label, category, sort_order) VALUES
  -- BUILDER FREE
  ('builder-free', 'max_opportunities', '3', 'Max Opportunities', 'limits', 0),
  ('builder-free', 'max_applications', '10', 'Max Applications', 'limits', 1),
  ('builder-free', 'max_saved_opportunities', '10', 'Max Saved Opportunities', 'limits', 2),
  ('builder-free', 'max_collaboration_spaces', '2', 'Max Collaboration Spaces', 'limits', 3),
  ('builder-free', 'max_team_members', '3', 'Max Team Members', 'limits', 4),
  ('builder-free', 'max_messages_per_day', '20', 'Max Messages Per Day', 'limits', 5),
  ('builder-free', 'max_file_storage_mb', '100', 'Max File Storage (MB)', 'limits', 6),
  ('builder-free', 'max_company_pages', '0', 'Max Company Pages', 'limits', 7),
  ('builder-free', 'max_professional_listings', '0', 'Max Professional Listings', 'limits', 8),
  ('builder-free', 'can_use_ai', 'false', 'AI Features', 'features', 9),
  ('builder-free', 'can_use_advanced_search', 'false', 'Advanced Search', 'features', 10),
  ('builder-free', 'can_access_analytics', 'false', 'Analytics Dashboard', 'features', 11),
  ('builder-free', 'can_access_builder_partners', 'false', 'Builder Partner Access', 'features', 12),
  ('builder-free', 'can_create_professional_profile', 'false', 'Create Professional Profile', 'features', 13),
  ('builder-free', 'can_create_company_page', 'false', 'Create Company Page', 'features', 14),
  ('builder-free', 'can_use_priority_placement', 'false', 'Priority Placement', 'features', 15),
  ('builder-free', 'can_use_sponsored_listings', 'false', 'Sponsored Listings', 'features', 16),
  ('builder-free', 'can_use_bulk_messaging', 'false', 'Bulk Messaging', 'features', 17),
  ('builder-free', 'can_use_recruiting_tools', 'false', 'Recruiting Tools', 'features', 18),
  ('builder-free', 'can_use_marketing_tools', 'false', 'Marketing Tools', 'features', 19),
  ('builder-free', 'profile_visibility', 'limited', 'Profile Visibility', 'visibility', 20),
  ('builder-free', 'verification_eligibility', 'basic', 'Verification Eligibility', 'visibility', 21),
  ('builder-free', 'priority_support', 'false', 'Priority Support', 'features', 22),

  -- BUILDER PRO
  ('builder-pro', 'max_opportunities', '15', 'Max Opportunities', 'limits', 0),
  ('builder-pro', 'max_applications', '50', 'Max Applications', 'limits', 1),
  ('builder-pro', 'max_saved_opportunities', '50', 'Max Saved Opportunities', 'limits', 2),
  ('builder-pro', 'max_collaboration_spaces', '10', 'Max Collaboration Spaces', 'limits', 3),
  ('builder-pro', 'max_team_members', '10', 'Max Team Members', 'limits', 4),
  ('builder-pro', 'max_messages_per_day', '100', 'Max Messages Per Day', 'limits', 5),
  ('builder-pro', 'max_file_storage_mb', '1000', 'Max File Storage (MB)', 'limits', 6),
  ('builder-pro', 'max_company_pages', '0', 'Max Company Pages', 'limits', 7),
  ('builder-pro', 'max_professional_listings', '0', 'Max Professional Listings', 'limits', 8),
  ('builder-pro', 'can_use_ai', 'true', 'AI Features', 'features', 9),
  ('builder-pro', 'can_use_advanced_search', 'true', 'Advanced Search', 'features', 10),
  ('builder-pro', 'can_access_analytics', 'true', 'Analytics Dashboard', 'features', 11),
  ('builder-pro', 'can_access_builder_partners', 'true', 'Builder Partner Access', 'features', 12),
  ('builder-pro', 'can_create_professional_profile', 'false', 'Create Professional Profile', 'features', 13),
  ('builder-pro', 'can_create_company_page', 'false', 'Create Company Page', 'features', 14),
  ('builder-pro', 'can_use_priority_placement', 'true', 'Priority Placement', 'features', 15),
  ('builder-pro', 'can_use_sponsored_listings', 'false', 'Sponsored Listings', 'features', 16),
  ('builder-pro', 'can_use_bulk_messaging', 'false', 'Bulk Messaging', 'features', 17),
  ('builder-pro', 'can_use_recruiting_tools', 'false', 'Recruiting Tools', 'features', 18),
  ('builder-pro', 'can_use_marketing_tools', 'false', 'Marketing Tools', 'features', 19),
  ('builder-pro', 'profile_visibility', 'public', 'Profile Visibility', 'visibility', 20),
  ('builder-pro', 'verification_eligibility', 'full', 'Verification Eligibility', 'visibility', 21),
  ('builder-pro', 'priority_support', 'false', 'Priority Support', 'features', 22),

  -- PROFESSIONAL
  ('professional', 'max_opportunities', '25', 'Max Opportunities', 'limits', 0),
  ('professional', 'max_applications', '100', 'Max Applications', 'limits', 1),
  ('professional', 'max_saved_opportunities', '100', 'Max Saved Opportunities', 'limits', 2),
  ('professional', 'max_collaboration_spaces', '15', 'Max Collaboration Spaces', 'limits', 3),
  ('professional', 'max_team_members', '15', 'Max Team Members', 'limits', 4),
  ('professional', 'max_messages_per_day', '200', 'Max Messages Per Day', 'limits', 5),
  ('professional', 'max_file_storage_mb', '5000', 'Max File Storage (MB)', 'limits', 6),
  ('professional', 'max_company_pages', '0', 'Max Company Pages', 'limits', 7),
  ('professional', 'max_professional_listings', '1', 'Max Professional Listings', 'limits', 8),
  ('professional', 'can_use_ai', 'true', 'AI Features', 'features', 9),
  ('professional', 'can_use_advanced_search', 'true', 'Advanced Search', 'features', 10),
  ('professional', 'can_access_analytics', 'true', 'Analytics Dashboard', 'features', 11),
  ('professional', 'can_access_builder_partners', 'true', 'Builder Partner Access', 'features', 12),
  ('professional', 'can_create_professional_profile', 'true', 'Create Professional Profile', 'features', 13),
  ('professional', 'can_create_company_page', 'false', 'Create Company Page', 'features', 14),
  ('professional', 'can_use_priority_placement', 'true', 'Priority Placement', 'features', 15),
  ('professional', 'can_use_sponsored_listings', 'true', 'Sponsored Listings', 'features', 16),
  ('professional', 'can_use_bulk_messaging', 'false', 'Bulk Messaging', 'features', 17),
  ('professional', 'can_use_recruiting_tools', 'false', 'Recruiting Tools', 'features', 18),
  ('professional', 'can_use_marketing_tools', 'true', 'Marketing Tools', 'features', 19),
  ('professional', 'profile_visibility', 'public', 'Profile Visibility', 'visibility', 20),
  ('professional', 'verification_eligibility', 'full', 'Verification Eligibility', 'visibility', 21),
  ('professional', 'priority_support', 'false', 'Priority Support', 'features', 22),

  -- COMPANY
  ('company', 'max_opportunities', '100', 'Max Opportunities', 'limits', 0),
  ('company', 'max_applications', '500', 'Max Applications', 'limits', 1),
  ('company', 'max_saved_opportunities', '500', 'Max Saved Opportunities', 'limits', 2),
  ('company', 'max_collaboration_spaces', '50', 'Max Collaboration Spaces', 'limits', 3),
  ('company', 'max_team_members', '50', 'Max Team Members', 'limits', 4),
  ('company', 'max_messages_per_day', '1000', 'Max Messages Per Day', 'limits', 5),
  ('company', 'max_file_storage_mb', '20000', 'Max File Storage (MB)', 'limits', 6),
  ('company', 'max_company_pages', '5', 'Max Company Pages', 'limits', 7),
  ('company', 'max_professional_listings', '0', 'Max Professional Listings', 'limits', 8),
  ('company', 'can_use_ai', 'true', 'AI Features', 'features', 9),
  ('company', 'can_use_advanced_search', 'true', 'Advanced Search', 'features', 10),
  ('company', 'can_access_analytics', 'true', 'Analytics Dashboard', 'features', 11),
  ('company', 'can_access_builder_partners', 'true', 'Builder Partner Access', 'features', 12),
  ('company', 'can_create_professional_profile', 'false', 'Create Professional Profile', 'features', 13),
  ('company', 'can_create_company_page', 'true', 'Create Company Page', 'features', 14),
  ('company', 'can_use_priority_placement', 'true', 'Priority Placement', 'features', 15),
  ('company', 'can_use_sponsored_listings', 'true', 'Sponsored Listings', 'features', 16),
  ('company', 'can_use_bulk_messaging', 'true', 'Bulk Messaging', 'features', 17),
  ('company', 'can_use_recruiting_tools', 'true', 'Recruiting Tools', 'features', 18),
  ('company', 'can_use_marketing_tools', 'true', 'Marketing Tools', 'features', 19),
  ('company', 'profile_visibility', 'public', 'Profile Visibility', 'visibility', 20),
  ('company', 'verification_eligibility', 'full', 'Verification Eligibility', 'visibility', 21),
  ('company', 'priority_support', 'true', 'Priority Support', 'features', 22)
ON CONFLICT (plan_tier, key) DO NOTHING;


-- ============ TRIGGER: updated_at for subscription_plans ============
CREATE OR REPLACE FUNCTION update_subscription_plans_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();

  RETURN NEW;

END;

$$;


DROP TRIGGER IF EXISTS subscription_plans_updated_at ON subscription_plans;

CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_plans_updated_at();


-- ============ TRIGGER: updated_at for user_subscriptions ============
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();

  RETURN NEW;

END;

$$;


DROP TRIGGER IF EXISTS user_subscriptions_updated_at ON user_subscriptions;

CREATE TRIGGER user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();

;
