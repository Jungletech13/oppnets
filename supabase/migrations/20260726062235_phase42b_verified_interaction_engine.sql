/*
# Phase 4.2B — Verified Interaction Engine

## Purpose
Corrects the Phase 4.2A flaw where independently active users in the same
space could be verified as collaborators without ever interacting on the
same work.

The Trust Layer does NOT verify participation. It verifies interaction.

A verified collaboration record now represents evidence that two specific
users interacted through shared work — not merely that they were active
in the same space.

## Interaction Model
Shared interactions are work items where BOTH participants are involved:
- Shared task interaction: one participant is owner, the other is reviewer
  on the same completed task
- Shared decision interaction: both participants decided the same decision
  (not supported by current schema — decided_by is single-user, stored as 0)
- Shared milestone interaction: both participants attributed to same milestone
  (not supported by current schema — no user attribution, stored as 0)
- Shared checklist interaction: both participants attributed to same checklist
  (not supported by current schema — no user attribution, stored as 0)
- Shared assignment interaction: one assigns (owner), other completes (reviewer)
  on the same completed task (counted within shared_task_interactions)

The tasks table has owner_id and reviewer_id, which is the primary
interaction evidence. Decisions, milestones, and checklist_items do not
currently have multi-user attribution, so those interaction counts
default to 0. Future phases may add attribution without redesign.

## Verification Requirements (calculation_version = 3)
A pair is verified when ALL of:
- shared_interaction_total >= min_shared_interactions
- overlap_days >= min_collaboration_overlap_days
- participant_one_total_contributions >= min_contributions_per_participant
- participant_two_total_contributions >= min_contributions_per_participant
- space status is completed or closed
- both participants are active members

Individual contributions remain in evidence_snapshot for reporting but
do NOT satisfy verification. Only shared interactions count.

## trust_config Addition
- min_shared_interactions = 2

## Existing Records
0 rows confirmed before correction. Safe to update calculation logic.
calculation_version = 3 for all new records. Version 1 and 2 results
remain distinguishable.

## No Schema Changes Required
The tasks table already has owner_id and reviewer_id for interaction
evidence. No new columns or tables needed.
*/

-- ============================================================
-- Seed min_shared_interactions trust_config value
-- ============================================================
INSERT INTO trust_config (key, value, description)
VALUES ('min_shared_interactions', '2', 'Minimum shared work interactions between two participants for collaboration verification (Phase 4.2B)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- Replace generation function with interaction-based logic (v3)
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
SET search_path TO public, pg_temp
AS $$
DECLARE
  v_space_status text;
  v_space_closed_at timestamptz;
  v_min_tasks int;
  v_min_decisions int;
  v_min_overlap int;
  v_min_contrib int;
  v_min_shared int;
  v_calc_version int := 3;
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
  v_shared_task_interactions int;
  v_shared_decision_interactions int;
  v_shared_milestone_interactions int;
  v_shared_checklist_interactions int;
  v_shared_assignment_interactions int;
  v_shared_interaction_total int;
  v_shared_task_ids uuid[];
  v_shared_decision_ids uuid[];
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
  IF v_min_tasks IS NULL THEN v_config_error := 'min_collaboration_tasks missing'; END IF;

  SELECT (tc.value::text)::int INTO v_min_decisions
    FROM trust_config tc WHERE tc.key = 'min_collaboration_decisions';
  IF v_min_decisions IS NULL AND v_config_error IS NULL THEN v_config_error := 'min_collaboration_decisions missing'; END IF;

  SELECT (tc.value::text)::int INTO v_min_overlap
    FROM trust_config tc WHERE tc.key = 'min_collaboration_overlap_days';
  IF v_min_overlap IS NULL AND v_config_error IS NULL THEN v_config_error := 'min_collaboration_overlap_days missing'; END IF;

  SELECT (tc.value::text)::int INTO v_min_contrib
    FROM trust_config tc WHERE tc.key = 'min_contributions_per_participant';
  IF v_min_contrib IS NULL AND v_config_error IS NULL THEN v_config_error := 'min_contributions_per_participant missing'; END IF;

  SELECT (tc.value::text)::int INTO v_min_shared
    FROM trust_config tc WHERE tc.key = 'min_shared_interactions';
  IF v_min_shared IS NULL AND v_config_error IS NULL THEN v_config_error := 'min_shared_interactions missing'; END IF;

  -- If any config value is missing or invalid, do not verify, write audit
  IF v_config_error IS NOT NULL OR v_min_tasks < 0 OR v_min_decisions < 0 OR v_min_overlap < 0 OR v_min_contrib < 0 OR v_min_shared < 0 THEN
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

    -- Per-participant task counts (for reporting, not verification)
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

    -- Per-participant decision counts (for reporting)
    SELECT count(*) INTO v_p1_decision_count
      FROM decisions d
      WHERE d.space_id = p_space_id
        AND d.decided_by = v_pair.uid1;

    SELECT count(*) INTO v_p2_decision_count
      FROM decisions d
      WHERE d.space_id = p_space_id
        AND d.decided_by = v_pair.uid2;

    v_p1_contrib := v_p1_task_count + v_p1_decision_count;
    v_p2_contrib := v_p2_task_count + v_p2_decision_count;

    -- SHARED TASK INTERACTIONS: completed tasks where one is owner and other is reviewer
    -- This is the core interaction evidence — two people worked on the same task
    SELECT count(*), array_agg(t.id) INTO v_shared_task_interactions, v_shared_task_ids
      FROM tasks t
      WHERE t.space_id = p_space_id
        AND t.completed_at IS NOT NULL
        AND (
          (t.owner_id = v_pair.uid1 AND t.reviewer_id = v_pair.uid2)
          OR (t.owner_id = v_pair.uid2 AND t.reviewer_id = v_pair.uid1)
        );

    -- SHARED DECISION INTERACTIONS: not supported by current schema (decided_by is single-user)
    v_shared_decision_interactions := 0;
    v_shared_decision_ids := ARRAY[]::uuid[];

    -- SHARED MILESTONE INTERACTIONS: not supported by current schema (no user attribution)
    v_shared_milestone_interactions := 0;

    -- SHARED CHECKLIST INTERACTIONS: not supported by current schema (no user attribution)
    v_shared_checklist_interactions := 0;

    -- SHARED ASSIGNMENT INTERACTIONS: counted within shared task interactions
    -- (owner assigns, reviewer completes — same as shared task interaction)
    v_shared_assignment_interactions := v_shared_task_interactions;

    -- Total shared interactions
    v_shared_interaction_total := v_shared_task_interactions
      + v_shared_decision_interactions
      + v_shared_milestone_interactions
      + v_shared_checklist_interactions;

    -- Build evidence snapshot with full interaction breakdown
    v_evidence := jsonb_build_object(
      'space_id', p_space_id,
      'space_status', v_space_status,
      'space_closed_at', v_space_closed_at,
      'participant_one', v_pair.uid1,
      'participant_two', v_pair.uid2,
      'started_at', v_started_at,
      'ended_at', v_ended_at,
      'overlap_days', v_overlap,
      'participant_one_contributions', v_p1_contrib,
      'participant_two_contributions', v_p2_contrib,
      'participant_one_task_count', v_p1_task_count,
      'participant_two_task_count', v_p2_task_count,
      'participant_one_decision_count', v_p1_decision_count,
      'participant_two_decision_count', v_p2_decision_count,
      'shared_task_interactions', v_shared_task_interactions,
      'shared_decision_interactions', v_shared_decision_interactions,
      'shared_milestone_interactions', v_shared_milestone_interactions,
      'shared_checklist_interactions', v_shared_checklist_interactions,
      'shared_assignment_interactions', v_shared_assignment_interactions,
      'shared_interaction_total', v_shared_interaction_total,
      'shared_task_ids', v_shared_task_ids,
      'shared_decision_ids', v_shared_decision_ids,
      'shared_milestone_ids', ARRAY[]::uuid[],
      'shared_checklist_ids', ARRAY[]::uuid[],
      'shared_assignment_ids', v_shared_task_ids,
      'configuration_used', jsonb_build_object(
        'min_shared_interactions', v_min_shared,
        'min_collaboration_overlap_days', v_min_overlap,
        'min_contributions_per_participant', v_min_contrib,
        'min_collaboration_tasks', v_min_tasks,
        'min_collaboration_decisions', v_min_decisions
      ),
      'calculation_version', v_calc_version
    );

    -- Determine verification status with interaction-based requirements
    IF v_shared_interaction_total >= v_min_shared
       AND v_p1_contrib >= v_min_contrib
       AND v_p2_contrib >= v_min_contrib
       AND v_overlap >= v_min_overlap
    THEN
      v_status := 'verified';
      v_reason := format(
        'This collaboration was verified because both participants remained active for %s overlapping days, completed %s shared work interactions, and satisfied all configured Trust Layer thresholds.',
        v_overlap, v_shared_interaction_total
      );
    ELSE
      v_status := 'insufficient_evidence';
      v_reason := format(
        'Insufficient evidence: %s/%s shared interactions, P1 %s/%s contributions, P2 %s/%s contributions, %s/%s days overlap',
        v_shared_interaction_total, v_min_shared,
        v_p1_contrib, v_min_contrib,
        v_p2_contrib, v_min_contrib,
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