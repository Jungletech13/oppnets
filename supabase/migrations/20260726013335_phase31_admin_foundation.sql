/*
# Phase 3.1 — Admin Foundation

## Purpose
Introduces the internal administration system for operating OppNets as a real platform.
This migration adds append-only audit logging for every administrative action and a
secure admin-authority helper function. No existing tables are modified.

## Admin Security Model
- Admin authority is determined by `auth.users.raw_app_metadata.role = 'admin'`.
- This is user-immutable metadata set by a superadmin via the Supabase service role —
  clients cannot assign admin privileges to themselves.
- A SQL helper `is_admin()` checks the current JWT's raw_app_metadata for the admin role.
- Default deny: every admin table is RLS-locked to admin-only access.

## New Tables

### admin_audit_log
Append-only record of every administrative action.
- id (uuid, primary key)
- admin_id (uuid, references auth.users) — who acted
- action (text) — what action occurred (e.g. 'user.suspend', 'verification.approve')
- target_type (text) — affected record type (e.g. 'user', 'verification_claim', 'fraud_alert')
- target_id (text) — affected record id
- reason (text) — admin-supplied reason for the action
- previous_state (jsonb) — snapshot of state before the action
- new_state (jsonb) — snapshot of state after the action
- created_at (timestamptz) — when the action occurred

### admin_notes
Internal notes admins attach to records during investigation.
- id (uuid, primary key)
- admin_id (uuid, references auth.users) — who wrote the note
- target_type (text) — record type (e.g. 'user', 'space')
- target_id (text) — record id
- note (text) — note content
- created_at (timestamptz)

## Security
- RLS enabled on both tables.
- All CRUD restricted to admin-only via the `is_admin()` helper.
- INSERT on admin_audit_log is admin-only (append-only — no UPDATE or DELETE policies).
- admin_notes allow admin INSERT/SELECT only (no UPDATE/DELETE).

## Important Notes
1. The `is_admin()` function reads from `auth.jwt() -> 'app_metadata' ->> 'role'`.
   Admin status is granted by setting `raw_app_metadata.role = 'admin'` on the auth user
   via the Supabase service role key (server-side only). Clients cannot self-assign.
2. admin_audit_log has NO update or delete policies — it is truly append-only at the RLS level.
3. No existing tables are altered. No existing data is touched.
*/

-- ============================================================
-- Helper function: is_admin()
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ============================================================
-- Table: admin_audit_log
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  reason text DEFAULT '',
  previous_state jsonb,
  new_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Compatibility for databases that already received the earlier Phase 3
-- admin_audit_log shape (`detail` / `at`). CREATE TABLE IF NOT EXISTS does not
-- add columns to an existing table, so make the Phase 3.1 contract explicit.
ALTER TABLE admin_audit_log
  ADD COLUMN IF NOT EXISTS reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS previous_state jsonb,
  ADD COLUMN IF NOT EXISTS new_state jsonb,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_audit_select" ON admin_audit_log;
CREATE POLICY "admin_audit_select" ON admin_audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_audit_insert" ON admin_audit_log;
CREATE POLICY "admin_audit_insert" ON admin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- No UPDATE or DELETE policies: append-only at the RLS level.

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log (admin_id);

-- ============================================================
-- Table: admin_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id text NOT NULL,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_notes_select" ON admin_notes;
CREATE POLICY "admin_notes_select" ON admin_notes
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_notes_insert" ON admin_notes;
CREATE POLICY "admin_notes_insert" ON admin_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- No UPDATE or DELETE policies: notes are immutable once written.

CREATE INDEX IF NOT EXISTS idx_admin_notes_target ON admin_notes (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_notes_created_at ON admin_notes (created_at DESC);
