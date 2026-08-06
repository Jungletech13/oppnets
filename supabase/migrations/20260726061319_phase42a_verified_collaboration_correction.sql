/*
# Phase 4.2A — Verified Collaboration Correction

## Purpose
Corrects three issues found in the Phase 4.2 audit:

1. Evidence was not pair-specific — tasks/decisions counted where EITHER
   participant was involved, allowing one active member to verify every
   other pair. Now requires BOTH participants to have attributable
   contributions.

2. Overlap threshold was hard-coded as `> 0`. Now reads
   `min_collaboration_overlap_days` from trust_config.

3. trust_event_log SELECT policy was `USING (true)` — all authenticated
   users could read all trust events. Now scoped to affected users,
   collaboration participants, and admins.

## Existing Record Handling
Confirmed 0 rows in verified_collaborations before correction.
Safe to update calculation logic. New calculations use
calculation_version = 2. Version 1 results remain distinguishable.

## trust_config Additions
- min_collaboration_overlap_days = 7 (minimum days of overlapping
  active membership)
- min_contributions_per_participant = 1 (minimum attributable
  contributions per participant)

## trust_event_log Changes
- Added `visibility` column (text, default 'private')
  Values: 'participant', 'private', 'admin', 'public'
- New collaboration events default to 'participant' visibility
- SELECT policy replaced: users see their own events, events for
  collaborations they participate in, or admin access

## Function Changes
### private._generate_verified_collaborations(uuid)
- calculation_version = 2
- Reads min_collaboration_overlap_days, min_contributions_per_participant,
  min_collaboration_tasks, min_collaboration_decisions from trust_config
- Calculates per-participant task and decision counts separately
- Requires BOTH participants to have >= min_contributions_per_participant
- Requires pair_total_tasks >= min_collaboration_tasks
- Requires pair_total_decisions >= min_collaboration_decisions
- Requires overlap_days >= min_collaboration_overlap_days
- Stores all per-participant values in evidence_snapshot
- Trust events written with visibility = 'participant'
- If config values are absent or invalid, does not verify, writes audit
- Idempotent, deterministic ordering, no client-supplied participant IDs

### public.admin_generate_verified_collaborations(uuid)
- Unchanged: admin-only, SECURITY DEFINER, safe search_path

### public.admin_invalidate_verified_collaboration(uuid, text)
- Unchanged: admin-only, SECURITY DEFINER, safe search_path, non-destructive
- Trust event for invalidation now written with visibility = 'private'

## Security
- No INSERT, UPDATE, DELETE policies on verified_collaborations
- trust_event_log SELECT scoped to user_id, participant, or admin
- All functions SECURITY DEFINER with safe search_path
- No subscription/payment references

## Important Notes
1. No universal numeric trust score introduced.
2. No payment, subscription, entitlement, or pricing data referenced.
3. Users cannot create, edit, or delete verified collaboration records.
4. calculation_version = 2 for all new records.
5. Version 1 results remain distinguishable.
6. No historical audit data removed.
7. No table redesign — only additive column, policy replacement, and
   function replacement.
*/

-- ============================================================
-- Seed new trust_config values
-- ============================================================
INSERT INTO trust_config (key, value, description)
VALUES ('min_collaboration_overlap_days', '7', 'Minimum days of overlapping active membership for collaboration verification (Phase 4.2A)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO trust_config (key, value, description)
VALUES ('min_contributions_per_participant', '1', 'Minimum attributable contributions per participant for collaboration verification (Phase 4.2A)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Add visibility column to trust_event_log
-- ============================================================
ALTER TABLE trust_event_log
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

-- ============================================================
-- Replace trust_event_log SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "trust_event_log_select" ON trust_event_log;
CREATE POLICY "trust_event_log_select" ON trust_event_log
  FOR SELECT TO authenticated
  USING (
    -- Admin sees all
    public.is_admin()
    -- User sees their own events
    OR auth.uid() = user_id
    -- User sees events for collaborations they participate in
    OR (
      target_type = 'verified_collaboration'
      AND target_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM verified_collaborations vc
        WHERE vc.id::text = trust_event_log.target_id
        AND (
          vc.participant_one_id = auth.uid()
          OR vc.participant_two_id = auth.uid()
        )
      )
    )
  );

-- ============================================================
-- Replace generation function with pair-specific logic (v2)
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
  v_min_overlap int;
  v_min_contrib int;
  v_calc_version int := 2;
  v_pair RECORD;
  v_started_at timestamptz;
  v_ended_at timestamptz;
  v_overlap int;
  v_p1_task_count int;
  v_p2_task_count int;
  v_p1_decision_count int;
  v_p2_decision_count int;
  v_p1_contrib int;
  v_p2_contrib int;
  v_pair_total_tasks int;
  v_pair_total_decisions int;
  v_member_count int;
  v_evidence jsonb;
  v_status text;
  v_reason text;
  v_existing_id uuid;
  v_new_id uuid;
  v_generated_count int := 0;
  v_config_error text;
BEGIN
  -- Validate space exists
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

  -- Read all thresholds from trust_config
  SELECT (tc.value::text)::int INTO v_min_tasks
    FROM trust_config tc WHERE tc.key = 'min_collaboration_tasks';
  IF v_min_tasks IS NULL THEN
    v_config_error := 'min_collaboration_tasks missing';
  END IF;

  SELECT (tc.value::text)::int INTO v_min_decisions
    FROM trust_config tc WHERE tc.key = 'min_collaboration_decisions';
  IF v_min_decisions IS NULL AND v_config_error IS NULL THEN
    v_config_error := 'min_collaboration_decisions missing';
  END IF;

  SELECT (tc.value::text)::int INTO v_min_overlap
    FROM trust_config tc WHERE tc.key = 'min_collaboration_overlap_days';
  IF v_min_overlap IS NULL AND v_config_error IS NULL THEN
    v_config_error := 'min_collaboration_overlap_days missing';
  END IF;

  SELECT (tc.value::text)::int INTO v_min_contrib
    FROM trust_config tc WHERE tc.key = 'min_contributions_per_participant';
  IF v_min_contrib IS NULL AND v_config_error IS NULL THEN
    v_config_error := 'min_contributions_per_participant missing';
  END IF;

  -- If any config value is missing or invalid, do not verify, write audit
  IF v_config_error IS NOT NULL OR v_min_tasks < 0 OR v_min_decisions < 0 OR v_min_overlap < 0 OR v_min_contrib < 0 THEN
    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'collaboration.generate', 'collaboration_space', p_space_id::text,
            'Config error: ' || COALESCE(v_config_error, 'invalid config value'),
            jsonb_build_object('calculation_version', v_calc_version, 'error', true));
    RETURN;
  END IF;

  -- Count active members
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

  -- Iterate over all unique member pairs (deterministic: lower user_id first)
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

    -- Per-participant task counts (completed tasks where participant is owner or reviewer)
    SELECT count(*) INTO v_p1_task_count
      FROM tasks t
      WHERE t.space_id = p_space_id
        AND t.completed_at IS NOT NULL
        AND (t.owner_id = v_pair.uid1 OR t.reviewer_id = v_pair.uid1);

    SELECT count(*) INTO v_p2_task_count
      FROM tasks t
      WHERE t.space_id = p_space_id
        AND t.completed_at IS NOT NULL
        AND (t.owner_id = v_pair.uid2 OR t.reviewer_id = v_pair.uid2);

    -- Per-participant decision counts
    SELECT count(*) INTO v_p1_decision_count
      FROM decisions d
      WHERE d.space_id = p_space_id
        AND d.decided_by = v_pair.uid1;

    SELECT count(*) INTO v_p2_decision_count
      FROM decisions d
      WHERE d.space_id = p_space_id
        AND d.decided_by = v_pair.uid2;

    -- Per-participant total contributions (tasks + decisions)
    v_p1_contrib := v_p1_task_count + v_p1_decision_count;
    v_p2_contrib := v_p2_task_count + v_p2_decision_count;

    -- Pair totals
    v_pair_total_tasks := v_p1_task_count + v_p2_task_count;
    v_pair_total_decisions := v_p1_decision_count + v_p2_decision_count;

    -- Build evidence snapshot with per-participant breakdown
    v_evidence := jsonb_build_object(
      'space_id', p_space_id,
      'space_status', v_space_status,
      'space_closed_at', v_space_closed_at,
      'participant_one', v_pair.uid1,
      'participant_two', v_pair.uid2,
      'started_at', v_started_at,
      'ended_at', v_ended_at,
      'overlap_days', v_overlap,
      'participant_one_task_count', v_p1_task_count,
      'participant_two_task_count', v_p2_task_count,
      'participant_one_decision_count', v_p1_decision_count,
      'participant_two_decision_count', v_p2_decision_count,
      'participant_one_total_contributions', v_p1_contrib,
      'participant_two_total_contributions', v_p2_contrib,
      'pair_total_tasks', v_pair_total_tasks,
      'pair_total_decisions', v_pair_total_decisions,
      'min_tasks_required', v_min_tasks,
      'min_decisions_required', v_min_decisions,
      'min_overlap_days_required', v_min_overlap,
      'min_contributions_per_participant', v_min_contrib,
      'calculation_version', v_calc_version
    );

    -- Determine verification status with pair-specific requirements
    IF v_p1_contrib >= v_min_contrib
       AND v_p2_contrib >= v_min_contrib
       AND v_pair_total_tasks >= v_min_tasks
       AND v_pair_total_decisions >= v_min_decisions
       AND v_overlap >= v_min_overlap
    THEN
      v_status := 'verified';
      v_reason := format(
        'Collaboration verified: P1 %s contributions, P2 %s contributions, %s pair tasks, %s pair decisions, %s days overlap',
        v_p1_contrib, v_p2_contrib, v_pair_total_tasks, v_pair_total_decisions, v_overlap
      );
    ELSE
      v_status := 'insufficient_evidence';
      v_reason := format(
        'Insufficient evidence: P1 %s/%s contributions, P2 %s/%s contributions, %s/%s pair tasks, %s/%s pair decisions, %s/%s days overlap',
        v_p1_contrib, v_min_contrib,
        v_p2_contrib, v_min_contrib,
        v_pair_total_tasks, v_min_tasks,
        v_pair_total_decisions, v_min_decisions,
        v_overlap, v_min_overlap
      );
    END IF;

    -- Check for existing record (idempotent)
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

      -- Write trust event with participant visibility
      INSERT INTO trust_event_log (event_type, target_type, target_id, user_id, metadata, visibility)
      VALUES ('collaboration.verified', 'verified_collaboration', v_new_id::text, v_pair.uid1,
              jsonb_build_object('participant_two', v_pair.uid2, 'status', v_status, 'calculation_version', v_calc_version),
              'participant');

      -- Write audit record
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
-- Update invalidation function to write private visibility event
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

  -- Write trust event with private visibility
  INSERT INTO trust_event_log (event_type, target_type, target_id, user_id, metadata, visibility)
  VALUES ('collaboration.invalidated', 'verified_collaboration', p_verified_collaboration_id::text,
          auth.uid(),
          jsonb_build_object('reason', p_reason, 'previous_status', v_existing.verification_status),
          'private');

  -- Write audit record
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

-- ============================================================
-- Admin generate function unchanged (already admin-only, delegates to private)
-- Confirm it's still correct:
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
-- Add index on trust_event_log visibility for policy performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_trust_event_log_visibility ON trust_event_log (visibility);
CREATE INDEX IF NOT EXISTS idx_trust_event_log_user_id ON trust_event_log (user_id);