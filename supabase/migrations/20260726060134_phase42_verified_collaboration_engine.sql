/*
# Phase 4.2 — Verified Collaboration Engine

## Purpose
Creates a system-owned, auditable record proving that two users genuinely
collaborated in an OppNets collaboration space. This phase establishes
verified collaboration facts only — no reviews, reputation scores, badges,
recommendations, or fraud scoring. Those belong to later phases.

## Schema Adjustments to Existing Tables (additive only, no data loss)

### space_members (add 3 columns)
- joined_at timestamptz DEFAULT now() — when the member joined the space
- left_at timestamptz (nullable) — when the member left or was removed
- status text DEFAULT 'active' — membership state: 'active', 'left', 'removed'

### collaboration_spaces (add 2 columns)
- status text DEFAULT 'active' — space state: 'active', 'completed', 'closed', 'archived'
- closed_at timestamptz (nullable) — when the space reached completion or closure

### tasks (add 1 column)
- completed_at timestamptz (nullable) — when the task was marked done

All additions are additive with safe defaults. No columns removed, no types
changed, no existing data modified. All affected tables are currently empty.

## New Schema: private
Holds internal Trust Layer functions that should not be called directly by
clients. Only public SECURITY DEFINER wrapper functions are exposed to
authenticated users.

## New Table: verified_collaborations

System-generated records proving two users collaborated in a space. Users
cannot create, edit, or delete these records — only Trust Layer functions can.

- id uuid PRIMARY KEY
- collaboration_space_id uuid REFERENCES collaboration_spaces(id)
- participant_one_id uuid REFERENCES profiles(id) — deterministic: lower user_id
- participant_two_id uuid REFERENCES profiles(id) — deterministic: higher user_id
- verification_status text — 'pending','verified','insufficient_evidence','invalidated'
- verification_reason text — explanation of the verification outcome
- started_at timestamptz — earliest joined_at among the two participants
- ended_at timestamptz — latest left_at or space closed_at among the two
- overlap_days integer — calculated days of overlapping active membership
- evidence_snapshot jsonb — exact evidence used to make the decision
- calculation_version integer — version of the calculation logic
- generated_at timestamptz — when this record was generated
- invalidated_at timestamptz — when an admin invalidated this record
- invalidation_reason text — why the record was invalidated
- created_at timestamptz

### Constraints
- UNIQUE (collaboration_space_id, participant_one_id, participant_two_id)
- CHECK (participant_one_id <> participant_two_id)
- CHECK (verification_status IN ('pending','verified','insufficient_evidence','invalidated'))
- CHECK (overlap_days >= 0)

## Security (RLS)
- SELECT: participants or admins only. No access to unrelated users' records.
- No INSERT, UPDATE, DELETE policies — all writes via SECURITY DEFINER functions.

## Functions
### private._generate_verified_collaborations(p_space_id)
SECURITY DEFINER. Validates space, identifies eligible pairs, calculates
overlap and evidence, creates deterministic records, writes trust events
and audit records atomically. Idempotent.

### public.admin_generate_verified_collaborations(p_space_id)
Admin-only wrapper that delegates to the private function.

### public.admin_invalidate_verified_collaboration(p_id, p_reason)
Admin-only. Preserves the original record, transitions to 'invalidated',
records reason, writes audit record atomically.

## Important Notes
1. No universal numeric trust score is introduced.
2. No payment, subscription, entitlement, or pricing data is referenced.
3. Users cannot create, edit, or delete verified collaboration records.
4. All generation and invalidation occurs through SECURITY DEFINER functions.
5. Every function sets a safe search_path, validates inputs, enforces
   authorization, and writes audit records atomically.
6. evidence_snapshot stores the exact evidence used so results are reproducible.
7. calculation_version allows future rule changes without altering history.
8. Deterministic participant ordering prevents duplicate reversed pairs.
9. Generation is idempotent — re-running produces no duplicates.
10. No scheduled Edge Function. Generation is admin-invoked.
*/

-- ============================================================
-- Create private schema for internal Trust Layer functions
-- ============================================================
CREATE SCHEMA IF NOT EXISTS private;

-- ============================================================
-- Schema Adjustments (additive, no data loss)
-- ============================================================

ALTER TABLE space_members
  ADD COLUMN IF NOT EXISTS joined_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE space_members
  ADD COLUMN IF NOT EXISTS left_at timestamptz;

ALTER TABLE space_members
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE collaboration_spaces
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE collaboration_spaces
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- ============================================================
-- Table: verified_collaborations
-- ============================================================
CREATE TABLE IF NOT EXISTS verified_collaborations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_space_id uuid NOT NULL REFERENCES collaboration_spaces(id) ON DELETE CASCADE,
  participant_one_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_two_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_status text NOT NULL,
  verification_reason text NOT NULL DEFAULT '',
  started_at timestamptz,
  ended_at timestamptz,
  overlap_days integer,
  evidence_snapshot jsonb,
  calculation_version integer NOT NULL DEFAULT 1,
  generated_at timestamptz NOT NULL DEFAULT now(),
  invalidated_at timestamptz,
  invalidation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verified_collabs_unique_pair UNIQUE (collaboration_space_id, participant_one_id, participant_two_id),
  CONSTRAINT verified_collabs_no_self_pair CHECK (participant_one_id <> participant_two_id),
  CONSTRAINT verified_collabs_valid_status CHECK (verification_status IN ('pending','verified','insufficient_evidence','invalidated')),
  CONSTRAINT verified_collabs_nonneg_overlap CHECK (overlap_days IS NULL OR overlap_days >= 0)
);

ALTER TABLE verified_collaborations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verified_collabs_select" ON verified_collaborations;
CREATE POLICY "verified_collabs_select" ON verified_collaborations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = participant_one_id
    OR auth.uid() = participant_two_id
    OR public.is_admin()
  );

CREATE INDEX IF NOT EXISTS idx_verified_collabs_space ON verified_collaborations (collaboration_space_id);
CREATE INDEX IF NOT EXISTS idx_verified_collabs_p1 ON verified_collaborations (participant_one_id);
CREATE INDEX IF NOT EXISTS idx_verified_collabs_p2 ON verified_collaborations (participant_two_id);
CREATE INDEX IF NOT EXISTS idx_verified_collabs_status ON verified_collaborations (verification_status);

-- ============================================================
-- Function: private._generate_verified_collaborations
-- ============================================================
CREATE OR REPLACE FUNCTION private._generate_verified_collaborations(p_space_id uuid)
RETURNS TABLE(
  participant_one_id uuid,
  participant_two_id uuid,
  verification_status text,
  verification_reason text,
  overlap_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_space_status text;
  v_space_closed_at timestamptz;
  v_min_tasks int;
  v_min_decisions int;
  v_calc_version int := 1;
  v_pair RECORD;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_overlap int;
  v_task_count int;
  v_decision_count int;
  v_member_count int;
  v_evidence jsonb;
  v_status text;
  v_reason text;
  v_existing_id uuid;
  v_new_id uuid;
  v_generated_count int := 0;
BEGIN
  SELECT cs.status, cs.closed_at
    INTO v_space_status, v_space_closed_at
    FROM collaboration_spaces cs
    WHERE cs.id = p_space_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Collaboration space % does not exist', p_space_id;
  END IF;

  IF v_space_status NOT IN ('completed', 'closed') THEN
    RAISE EXCEPTION 'Space % must be completed or closed to generate verified collaborations (current: %)', p_space_id, v_space_status;
  END IF;

  SELECT (tc.value::text)::int INTO v_min_tasks
    FROM trust_config tc WHERE tc.key = 'min_collaboration_tasks';
  IF v_min_tasks IS NULL THEN v_min_tasks := 3; END IF;

  SELECT (tc.value::text)::int INTO v_min_decisions
    FROM trust_config tc WHERE tc.key = 'min_collaboration_decisions';
  IF v_min_decisions IS NULL THEN v_min_decisions := 1; END IF;

  SELECT count(*) INTO v_member_count
    FROM space_members sm
    WHERE sm.space_id = p_space_id
      AND sm.status = 'active';

  IF v_member_count < 2 THEN
    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'collaboration.generate', 'collaboration_space', p_space_id::text,
            'Insufficient active members (fewer than 2)',
            jsonb_build_object('member_count', v_member_count, 'calculation_version', v_calc_version));
    RETURN;
  END IF;

  FOR v_pair IN
    SELECT
      sm1.user_id AS uid1,
      sm2.user_id AS uid2,
      LEAST(sm1.joined_at, sm2.joined_at) AS pair_started,
      COALESCE(
        LEAST(
          COALESCE(sm1.left_at, COALESCE(v_space_closed_at, now())),
          COALESCE(sm2.left_at, COALESCE(v_space_closed_at, now()))
        ),
        now()
      ) AS pair_ended
    FROM space_members sm1
    JOIN space_members sm2 ON sm1.space_id = sm2.space_id
      AND sm1.user_id < sm2.user_id
    WHERE sm1.space_id = p_space_id
      AND sm1.status = 'active'
      AND sm2.status = 'active'
  LOOP
    v_started_at := v_pair.pair_started;
    v_ended_at := v_pair.pair_ended;
    v_overlap := GREATEST(0, EXTRACT(day FROM (v_ended_at - v_started_at))::int);

    SELECT count(*) INTO v_task_count
      FROM tasks t
      WHERE t.space_id = p_space_id
        AND t.completed_at IS NOT NULL
        AND (t.owner_id = v_pair.uid1 OR t.owner_id = v_pair.uid2
             OR t.reviewer_id = v_pair.uid1 OR t.reviewer_id = v_pair.uid2);

    SELECT count(*) INTO v_decision_count
      FROM decisions d
      WHERE d.space_id = p_space_id
        AND d.decided_by IN (v_pair.uid1, v_pair.uid2);

    v_evidence := jsonb_build_object(
      'space_id', p_space_id,
      'space_status', v_space_status,
      'space_closed_at', v_space_closed_at,
      'participant_one', v_pair.uid1,
      'participant_two', v_pair.uid2,
      'started_at', v_started_at,
      'ended_at', v_ended_at,
      'overlap_days', v_overlap,
      'completed_tasks', v_task_count,
      'decisions_participated', v_decision_count,
      'min_tasks_required', v_min_tasks,
      'min_decisions_required', v_min_decisions,
      'calculation_version', v_calc_version
    );

    IF v_task_count >= v_min_tasks AND v_decision_count >= v_min_decisions AND v_overlap > 0 THEN
      v_status := 'verified';
      v_reason := format('Collaboration verified: %s completed tasks, %s decisions, %s days overlap',
                         v_task_count, v_decision_count, v_overlap);
    ELSE
      v_status := 'insufficient_evidence';
      v_reason := format('Insufficient evidence: %s/%s tasks, %s/%s decisions, %s days overlap',
                         v_task_count, v_min_tasks, v_decision_count, v_min_decisions, v_overlap);
    END IF;

    SELECT vc.id INTO v_existing_id
      FROM verified_collaborations vc
      WHERE vc.collaboration_space_id = p_space_id
        AND vc.participant_one_id = v_pair.uid1
        AND vc.participant_two_id = v_pair.uid2;

    IF v_existing_id IS NULL THEN
      INSERT INTO verified_collaborations (
        collaboration_space_id,
        participant_one_id,
        participant_two_id,
        verification_status,
        verification_reason,
        started_at,
        ended_at,
        overlap_days,
        evidence_snapshot,
        calculation_version,
        generated_at
      ) VALUES (
        p_space_id,
        v_pair.uid1,
        v_pair.uid2,
        v_status,
        v_reason,
        v_started_at,
        v_ended_at,
        v_overlap,
        v_evidence,
        v_calc_version,
        now()
      )
      RETURNING id INTO v_new_id;

      v_generated_count := v_generated_count + 1;

      INSERT INTO trust_event_log (event_type, target_type, target_id, user_id, metadata)
      VALUES ('collaboration.verified', 'verified_collaboration', v_new_id, v_pair.uid1,
              jsonb_build_object('participant_two', v_pair.uid2, 'status', v_status, 'evidence', v_evidence));

      INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
      VALUES ('system', 'collaboration.generate', 'verified_collaboration', v_new_id::text, v_reason, v_evidence);
    ELSE
      CONTINUE;
    END IF;

    participant_one_id := v_pair.uid1;
    participant_two_id := v_pair.uid2;
    verification_status := v_status;
    verification_reason := v_reason;
    overlap_days := v_overlap;
    RETURN NEXT;
  END LOOP;

  IF v_generated_count = 0 AND v_member_count >= 2 THEN
    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'collaboration.generate', 'collaboration_space', p_space_id::text,
            'No new verified collaboration records generated (all pairs already exist or insufficient evidence)',
            jsonb_build_object('member_count', v_member_count, 'calculation_version', v_calc_version));
  END IF;
END;
$$;

-- ============================================================
-- Function: public.admin_generate_verified_collaborations
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_generate_verified_collaborations(p_space_id uuid)
RETURNS TABLE(
  participant_one_id uuid,
  participant_two_id uuid,
  verification_status text,
  verification_reason text,
  overlap_days integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF p_space_id IS NULL THEN
    RAISE EXCEPTION 'Space ID is required';
  END IF;

  RETURN QUERY SELECT * FROM private._generate_verified_collaborations(p_space_id);
END;
$$;

-- ============================================================
-- Function: public.admin_invalidate_verified_collaboration
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_invalidate_verified_collaboration(
  p_verified_collaboration_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  IF p_verified_collaboration_id IS NULL THEN
    RAISE EXCEPTION 'Verified collaboration ID is required';
  END IF;
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Invalidation reason is required';
  END IF;

  SELECT * INTO v_existing
    FROM verified_collaborations
    WHERE id = p_verified_collaboration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verified collaboration % does not exist', p_verified_collaboration_id;
  END IF;

  IF v_existing.verification_status = 'invalidated' THEN
    RAISE EXCEPTION 'Record is already invalidated';
  END IF;

  UPDATE verified_collaborations
    SET verification_status = 'invalidated',
        invalidated_at = now(),
        invalidation_reason = p_reason
    WHERE id = p_verified_collaboration_id;

  INSERT INTO trust_audit_records (
    actor_id,
    actor_type,
    decision_type,
    target_type,
    target_id,
    reason,
    previous_state,
    new_state
  ) VALUES (
    auth.uid(),
    'admin',
    'collaboration.invalidate',
    'verified_collaboration',
    p_verified_collaboration_id::text,
    p_reason,
    jsonb_build_object('status', v_existing.verification_status),
    jsonb_build_object('status', 'invalidated', 'invalidated_at', now())
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_generate_verified_collaborations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_invalidate_verified_collaboration(uuid, text) TO authenticated;