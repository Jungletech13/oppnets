/*
# Phase 4.3 — Review Eligibility Engine

## Purpose
Creates the Review Eligibility Engine — the bridge between verified
collaborations and future peer reviews. When a collaboration is verified,
the Trust Layer automatically generates review eligibility records: one
in each direction (A reviews B, B reviews A).

Users may NEVER create eligibility records directly. Only the Trust Layer
creates them, and only from a verified collaboration.

## New Table: review_eligibility

| Column | Type | Description |
|---|---|---|
| id | uuid PK | Auto-generated |
| verified_collaboration_id | uuid FK | References verified_collaborations.id |
| reviewer_id | uuid NOT NULL | The person who may write a review |
| reviewee_id | uuid NOT NULL | The person being reviewed |
| generated_at | timestamptz NOT NULL DEFAULT now() | When eligibility was created |
| expires_at | timestamptz NOT NULL | When eligibility expires (generated_at + review_eligibility_window_days) |
| eligibility_status | text NOT NULL DEFAULT 'pending' | pending, eligible, consumed, expired, revoked |
| calculation_version | int NOT NULL DEFAULT 3 | Matches verified collaboration version |
| generation_reason | text NOT NULL DEFAULT '' | Plain-language explanation |
| consumed_at | timestamptz | When a review was submitted (future phase) |
| revoked_at | timestamptz | When admin revoked eligibility |
| revocation_reason | text | Reason for revocation |
| created_at | timestamptz NOT NULL DEFAULT now() | Record creation timestamp |

## Constraints
- UNIQUE (verified_collaboration_id, reviewer_id, reviewee_id) — one eligibility per direction per collaboration
- CHECK (reviewer_id != reviewee_id) — cannot review yourself
- eligibility_status CHECK in ('pending', 'eligible', 'consumed', 'expired', 'revoked')

## Functions

### private._generate_review_eligibility(p_verified_collaboration_id uuid)
SECURITY DEFINER. Called after a verified collaboration is created.
Creates two eligibility records (one in each direction) if they don't
already exist. Idempotent. Reads review_eligibility_window_days from
trust_config. Writes audit records and trust events.

### public.admin_revoke_review_eligibility(p_eligibility_id uuid, p_reason text)
SECURITY DEFINER. Admin-only. Revokes an eligibility record. Non-destructive:
sets status to 'revoked', records revocation_at and reason, writes audit.
Preserves history.

### public.expire_review_eligibility()
SECURITY DEFINER. Expires pending/eligible records past their expires_at
window. Can be called by any authenticated user (safe operation). Returns
count of expired records.

## RLS Policies
- SELECT: reviewer or reviewee can read their own eligibility records; admins see all
- INSERT: none (only SECURITY DEFINER function creates records)
- UPDATE: none (only SECURITY DEFINER functions modify records)
- DELETE: none (records are never deleted, only revoked/expired)

## Security
- RLS enabled on review_eligibility
- No direct INSERT/UPDATE/DELETE by any user
- All mutations through SECURITY DEFINER functions
- No payment or subscription references
- No Business Layer dependencies
*/

-- ============================================================
-- Create review_eligibility table
-- ============================================================
CREATE TABLE IF NOT EXISTS review_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verified_collaboration_id uuid NOT NULL REFERENCES verified_collaborations(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL,
  reviewee_id uuid NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  eligibility_status text NOT NULL DEFAULT 'pending' CHECK (eligibility_status IN ('pending', 'eligible', 'consumed', 'expired', 'revoked')),
  calculation_version int NOT NULL DEFAULT 3,
  generation_reason text NOT NULL DEFAULT '',
  consumed_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_eligibility_per_direction UNIQUE (verified_collaboration_id, reviewer_id, reviewee_id),
  CONSTRAINT no_self_review CHECK (reviewer_id != reviewee_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_review_eligibility_reviewer ON review_eligibility(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_review_eligibility_reviewee ON review_eligibility(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_review_eligibility_status ON review_eligibility(eligibility_status);
CREATE INDEX IF NOT EXISTS idx_review_eligibility_vc ON review_eligibility(verified_collaboration_id);
CREATE INDEX IF NOT EXISTS idx_review_eligibility_expires ON review_eligibility(expires_at) WHERE eligibility_status IN ('pending', 'eligible');

-- ============================================================
-- Enable RLS
-- ============================================================
ALTER TABLE review_eligibility ENABLE ROW LEVEL SECURITY;

-- SELECT: reviewer or reviewee can read their own eligibility; admins see all
DROP POLICY IF EXISTS "select_own_eligibility" ON review_eligibility;
CREATE POLICY "select_own_eligibility" ON review_eligibility FOR SELECT
  TO authenticated
  USING (
    is_admin()
    OR auth.uid() = reviewer_id
    OR auth.uid() = reviewee_id
  );

-- No INSERT, UPDATE, or DELETE policies — all mutations through SECURITY DEFINER functions

-- ============================================================
-- private._generate_review_eligibility
-- Called after a verified collaboration is created.
-- Creates two eligibility records (one in each direction).
-- Idempotent.
-- ============================================================
CREATE OR REPLACE FUNCTION private._generate_review_eligibility(p_verified_collaboration_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_vc RECORD;
  v_window_days int;
  v_calc_version int;
  v_generated_count int := 0;
  v_existing_count int;
  v_expires_at timestamptz;
  v_reason text;
  v_eligibility_id uuid;
BEGIN
  -- Fetch the verified collaboration
  SELECT vc.id, vc.participant_one_id, vc.participant_two_id, vc.calculation_version, vc.verification_status
    INTO v_vc
    FROM verified_collaborations vc
    WHERE vc.id = p_verified_collaboration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verified collaboration % does not exist', p_verified_collaboration_id;
  END IF;

  IF v_vc.verification_status != 'verified' THEN
    -- Only generate eligibility for verified collaborations
    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'eligibility.generate', 'verified_collaboration', p_verified_collaboration_id::text,
            'Skipped: collaboration not verified (status: ' || v_vc.verification_status || ')',
            jsonb_build_object('verification_status', v_vc.verification_status));
    RETURN 0;
  END IF;

  v_calc_version := COALESCE(v_vc.calculation_version, 3);

  -- Read review_eligibility_window_days from trust_config
  SELECT (tc.value::text)::int INTO v_window_days
    FROM trust_config tc WHERE tc.key = 'review_eligibility_window_days';

  IF v_window_days IS NULL OR v_window_days <= 0 THEN
    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'eligibility.generate', 'verified_collaboration', p_verified_collaboration_id::text,
            'Config error: review_eligibility_window_days missing or invalid',
            jsonb_build_object('error', true));
    RETURN 0;
  END IF;

  v_expires_at := now() + (v_window_days || ' days')::interval;
  v_reason := format('Eligibility generated from verified collaboration (calculation_version=%s). Expires in %s days.', v_calc_version, v_window_days);

  -- Direction 1: participant_one reviews participant_two
  SELECT count(*) INTO v_existing_count
    FROM review_eligibility
    WHERE verified_collaboration_id = p_verified_collaboration_id
      AND reviewer_id = v_vc.participant_one_id
      AND reviewee_id = v_vc.participant_two_id;

  IF v_existing_count = 0 THEN
    INSERT INTO review_eligibility (verified_collaboration_id, reviewer_id, reviewee_id, expires_at, calculation_version, generation_reason)
    VALUES (p_verified_collaboration_id, v_vc.participant_one_id, v_vc.participant_two_id, v_expires_at, v_calc_version, v_reason)
    RETURNING id INTO v_eligibility_id;

    v_generated_count := v_generated_count + 1;

    INSERT INTO trust_event_log (event_type, target_type, target_id, user_id, metadata, visibility)
    VALUES ('eligibility.generated', 'review_eligibility', v_eligibility_id::text, v_vc.participant_one_id,
            jsonb_build_object('reviewee_id', v_vc.participant_two_id, 'verified_collaboration_id', p_verified_collaboration_id, 'calculation_version', v_calc_version),
            'participant');

    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'eligibility.generate', 'review_eligibility', v_eligibility_id::text, v_reason,
            jsonb_build_object('reviewer_id', v_vc.participant_one_id, 'reviewee_id', v_vc.participant_two_id, 'expires_at', v_expires_at, 'calculation_version', v_calc_version));
  END IF;

  -- Direction 2: participant_two reviews participant_one
  SELECT count(*) INTO v_existing_count
    FROM review_eligibility
    WHERE verified_collaboration_id = p_verified_collaboration_id
      AND reviewer_id = v_vc.participant_two_id
      AND reviewee_id = v_vc.participant_one_id;

  IF v_existing_count = 0 THEN
    INSERT INTO review_eligibility (verified_collaboration_id, reviewer_id, reviewee_id, expires_at, calculation_version, generation_reason)
    VALUES (p_verified_collaboration_id, v_vc.participant_two_id, v_vc.participant_one_id, v_expires_at, v_calc_version, v_reason)
    RETURNING id INTO v_eligibility_id;

    v_generated_count := v_generated_count + 1;

    INSERT INTO trust_event_log (event_type, target_type, target_id, user_id, metadata, visibility)
    VALUES ('eligibility.generated', 'review_eligibility', v_eligibility_id::text, v_vc.participant_two_id,
            jsonb_build_object('reviewee_id', v_vc.participant_one_id, 'verified_collaboration_id', p_verified_collaboration_id, 'calculation_version', v_calc_version),
            'participant');

    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'eligibility.generate', 'review_eligibility', v_eligibility_id::text, v_reason,
            jsonb_build_object('reviewer_id', v_vc.participant_two_id, 'reviewee_id', v_vc.participant_one_id, 'expires_at', v_expires_at, 'calculation_version', v_calc_version));
  END IF;

  RETURN v_generated_count;
END;
$$;

-- ============================================================
-- public.admin_revoke_review_eligibility
-- Admin-only. Non-destructive revocation.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_revoke_review_eligibility(p_eligibility_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_eligibility RECORD;
BEGIN
  SELECT id, reviewer_id, reviewee_id, eligibility_status, verified_collaboration_id
    INTO v_eligibility
    FROM review_eligibility
    WHERE id = p_eligibility_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review eligibility % does not exist', p_eligibility_id;
  END IF;

  IF v_eligibility.eligibility_status = 'revoked' THEN
    RAISE EXCEPTION 'Review eligibility % is already revoked', p_eligibility_id;
  END IF;

  UPDATE review_eligibility
    SET eligibility_status = 'revoked',
        revoked_at = now(),
        revocation_reason = p_reason
    WHERE id = p_eligibility_id;

  INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, previous_state, new_state)
  VALUES ('admin', 'eligibility.revoke', 'review_eligibility', p_eligibility_id::text, p_reason,
          jsonb_build_object('previous_status', v_eligibility.eligibility_status),
          jsonb_build_object('status', 'revoked', 'reviewer_id', v_eligibility.reviewer_id, 'reviewee_id', v_eligibility.reviewee_id));

  INSERT INTO trust_event_log (event_type, target_type, target_id, user_id, metadata, visibility)
  VALUES ('eligibility.revoked', 'review_eligibility', p_eligibility_id::text, v_eligibility.reviewer_id,
          jsonb_build_object('reviewee_id', v_eligibility.reviewee_id, 'reason', p_reason),
          'participant');
END;
$$;

-- ============================================================
-- public.expire_review_eligibility
-- Expires pending/eligible records past their expires_at window.
-- Safe for any authenticated user to call.
-- ============================================================
CREATE OR REPLACE FUNCTION public.expire_review_eligibility()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_expired_count int := 0;
  v_record RECORD;
BEGIN
  FOR v_record IN
    SELECT id, reviewer_id, reviewee_id, eligibility_status
      FROM review_eligibility
      WHERE eligibility_status IN ('pending', 'eligible')
        AND expires_at < now()
  LOOP
    UPDATE review_eligibility
      SET eligibility_status = 'expired'
      WHERE id = v_record.id;

    v_expired_count := v_expired_count + 1;

    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, previous_state, new_state)
    VALUES ('system', 'eligibility.expire', 'review_eligibility', v_record.id::text,
            'Eligibility expired (past expires_at window)',
            jsonb_build_object('previous_status', v_record.eligibility_status),
            jsonb_build_object('status', 'expired'));

    INSERT INTO trust_event_log (event_type, target_type, target_id, user_id, metadata, visibility)
    VALUES ('eligibility.expired', 'review_eligibility', v_record.id::text, v_record.reviewer_id,
            jsonb_build_object('reviewee_id', v_record.reviewee_id),
            'participant');
  END LOOP;

  RETURN v_expired_count;
END;
$$;