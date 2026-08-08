/*
# Phase 3 Schema — Administration & Operations Center

## Overview
Adds 4 new tables for the Administration & Operations Center: admin audit logging,
moderation reports, verification submissions, and admin-managed listing status.

## New Tables
1. **admin_audit_log** — Immutable record of every admin action taken on the platform.
   - id, admin_id, action, target_type, target_id, detail, at
   - Captures: suspend, ban, restore, upgrade, reset verification, approve/reject
   verification, approve/reject report, feature/sponsor/hide/archive listings.

2. **moderation_reports** — Moderation queue entries for spam, scams, fake profiles,
   abuse, copyright, duplicate accounts.
   - id, reporter_id, target_type ('user'|'opportunity'|'professional'|'company'),
   target_id, reason, category, evidence_url, status, admin_notes, created_at,
   resolved_at, resolved_by

3. **verification_submissions** — Verification queue entries for identity, professional,
   business, and company verification.
   - id, user_id, verification_type ('identity'|'professional'|'business'|'company'),
   status ('pending'|'approved'|'rejected'|'needs_review'), evidence_url, notes,
   ai_recommendation, decided_by, decided_at, created_at

4. **admin_listing_status** — Admin-controlled visibility/feature state for marketplace
   listings (professionals, companies, builder partners, success stories, resources).
   - id, listing_type, listing_id, status ('visible'|'hidden'|'featured'|'sponsored'|
   'archived'), updated_by, updated_at

## Security
- RLS enabled on all tables.
- admin_audit_log: admin-only insert;
 admins can read (audit trail). Uses a helper
  function is_admin() that checks raw_app_meta_data for role='admin'.
- moderation_reports: authenticated can insert (file a report);
 admins can read/update.
- verification_submissions: authenticated can insert (submit verification);
 admins can
  read/update.
- admin_listing_status: admins only (read/write).
- The is_admin() SQL function checks the requester's JWT raw_app_meta_data for an
  'admin' role claim. Admins are designated by setting raw_app_meta_data->>'role' = 'admin'
  on their auth.users record.

## Important Notes
1. The is_admin() function uses auth.jwt() -> 'app_metadata' to check admin role.
2. All admin-scoped policies use is_admin() in USING/WITH CHECK.
3. Owner columns default to auth.uid() for seamless inserts.
4. Tables are idempotent (IF NOT EXISTS).
*/

-- Helper function: is_admin() — checks JWT app_metadata for role='admin'
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );

$$;


-- ============ TABLES ============

-- Admin audit log
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id text DEFAULT '',
  detail text DEFAULT '',
  at timestamptz DEFAULT now()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;


-- Moderation reports
CREATE TABLE IF NOT EXISTS moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('user', 'opportunity', 'professional', 'company')),
  target_id text NOT NULL,
  reason text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'spam' CHECK (category IN ('spam', 'scam', 'fake_profile', 'abuse', 'copyright', 'duplicate_account', 'other')),
  evidence_url text DEFAULT '',
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'resolved', 'dismissed')),
  admin_notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;


-- Verification submissions
CREATE TABLE IF NOT EXISTS verification_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('identity', 'professional', 'business', 'company')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_review')),
  evidence_url text DEFAULT '',
  notes text DEFAULT '',
  ai_recommendation text DEFAULT '',
  decided_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_submissions ENABLE ROW LEVEL SECURITY;


-- Admin listing status
CREATE TABLE IF NOT EXISTS admin_listing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_type text NOT NULL CHECK (listing_type IN ('professional', 'company', 'builder_partner', 'success_story', 'resource_article')),
  listing_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden', 'featured', 'sponsored', 'archived')),
  updated_by uuid DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (listing_type, listing_id)
);

ALTER TABLE admin_listing_status ENABLE ROW LEVEL SECURITY;


-- ============ RLS POLICIES ============

-- Admin audit log: admins can read and insert
DROP POLICY IF EXISTS "select_admin_audit_log" ON admin_audit_log;

CREATE POLICY "select_admin_audit_log" ON admin_audit_log FOR SELECT
  TO authenticated USING (is_admin());


DROP POLICY IF EXISTS "insert_admin_audit_log" ON admin_audit_log;

CREATE POLICY "insert_admin_audit_log" ON admin_audit_log FOR INSERT
  TO authenticated WITH CHECK (is_admin());


-- Moderation reports: authenticated can insert (file report), admins can read/update
DROP POLICY IF EXISTS "select_moderation_reports" ON moderation_reports;

CREATE POLICY "select_moderation_reports" ON moderation_reports FOR SELECT
  TO authenticated USING (is_admin() OR auth.uid() = reporter_id);


DROP POLICY IF EXISTS "insert_moderation_reports" ON moderation_reports;

CREATE POLICY "insert_moderation_reports" ON moderation_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = reporter_id);


DROP POLICY IF EXISTS "update_moderation_reports" ON moderation_reports;

CREATE POLICY "update_moderation_reports" ON moderation_reports FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- Verification submissions: authenticated can insert, admins can read/update
DROP POLICY IF EXISTS "select_verification_submissions" ON verification_submissions;

CREATE POLICY "select_verification_submissions" ON verification_submissions FOR SELECT
  TO authenticated USING (is_admin() OR auth.uid() = user_id);


DROP POLICY IF EXISTS "insert_verification_submissions" ON verification_submissions;

CREATE POLICY "insert_verification_submissions" ON verification_submissions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);


DROP POLICY IF EXISTS "update_verification_submissions" ON verification_submissions;

CREATE POLICY "update_verification_submissions" ON verification_submissions FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- Admin listing status: admins only
DROP POLICY IF EXISTS "select_admin_listing_status" ON admin_listing_status;

CREATE POLICY "select_admin_listing_status" ON admin_listing_status FOR SELECT
  TO authenticated USING (is_admin());


DROP POLICY IF EXISTS "insert_admin_listing_status" ON admin_listing_status;

CREATE POLICY "insert_admin_listing_status" ON admin_listing_status FOR INSERT
  TO authenticated WITH CHECK (is_admin());


DROP POLICY IF EXISTS "update_admin_listing_status" ON admin_listing_status;

CREATE POLICY "update_admin_listing_status" ON admin_listing_status FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());


-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_at ON admin_audit_log(at DESC);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports(status);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_category ON moderation_reports(category);

CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter ON moderation_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_verification_submissions_status ON verification_submissions(status);

CREATE INDEX IF NOT EXISTS idx_verification_submissions_type ON verification_submissions(verification_type);

CREATE INDEX IF NOT EXISTS idx_verification_submissions_user ON verification_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_admin_listing_status_type ON admin_listing_status(listing_type);

CREATE INDEX IF NOT EXISTS idx_admin_listing_status_listing ON admin_listing_status(listing_id);
;
