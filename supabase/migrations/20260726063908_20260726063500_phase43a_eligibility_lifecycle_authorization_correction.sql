/*
# Phase 4.3A — Eligibility Lifecycle and Authorization Correction

Corrects two gaps found in Phase 4.3:

1. Records were created as 'pending' but no function ever transitioned
   them to 'eligible'. The parent verified_collaboration has already passed
   all Trust Layer verification, so there is no meaningful second-stage
   activation check. Records are now created directly as 'eligible'.

2. The public expiry and revocation functions had broad EXECUTE grants
   with no internal admin checks. Any authenticated or anonymous user
   could trigger global Trust Layer state transitions. Both functions
   now validate is_admin() internally, and the insecure public expiry
   function is replaced by an admin-only wrapper around a private
   internal function.
*/

-- ============================================================
-- 1. Change table default from 'pending' to 'eligible'
-- ============================================================
ALTER TABLE review_eligibility
  ALTER COLUMN eligibility_status SET DEFAULT 'eligible';

-- Update the partial index to only cover 'eligible' (not 'pending')
DROP INDEX IF EXISTS idx_review_eligibility_expires;
CREATE INDEX idx_review_eligibility_expires ON review_eligibility(expires_at)
  WHERE eligibility_status = 'eligible';

-- ============================================================
-- 2. Replace private._generate_review_eligibility
--    Now creates records directly as 'eligible'
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
  SELECT vc.id, vc.participant_one_id, vc.participant_two_id, vc.calculation_version, vc.verification_status
    INTO v_vc
    FROM verified_collaborations vc
    WHERE vc.id = p_verified_collaboration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Verified collaboration % does not exist', p_verified_collaboration_id;
  END IF;

  IF v_vc.verification_status != 'verified' THEN
    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'eligibility.generate', 'verified_collaboration', p_verified_collaboration_id::text,
            'Skipped: collaboration not verified (status: ' || v_vc.verification_status || ')',
            jsonb_build_object('verification_status', v_vc.verification_status));
    RETURN 0;
  END IF;

  v_calc_version := COALESCE(v_vc.calculation_version, 3);

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
    INSERT INTO review_eligibility (verified_collaboration_id, reviewer_id, reviewee_id, eligibility_status, expires_at, calculation_version, generation_reason)
    VALUES (p_verified_collaboration_id, v_vc.participant_one_id, v_vc.participant_two_id, 'eligible', v_expires_at, v_calc_version, v_reason)
    RETURNING id INTO v_eligibility_id;

    v_generated_count := v_generated_count + 1;

    INSERT INTO trust_event_log (event_type, target_type, target_id, user_id, metadata, visibility)
    VALUES ('eligibility.generated', 'review_eligibility', v_eligibility_id::text, v_vc.participant_one_id,
            jsonb_build_object('reviewee_id', v_vc.participant_two_id, 'verified_collaboration_id', p_verified_collaboration_id, 'calculation_version', v_calc_version),
            'participant');

    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'eligibility.generate', 'review_eligibility', v_eligibility_id::text, v_reason,
            jsonb_build_object('reviewer_id', v_vc.participant_one_id, 'reviewee_id', v_vc.participant_two_id, 'expires_at', v_expires_at, 'calculation_version', v_calc_version, 'status', 'eligible'));
  END IF;

  -- Direction 2: participant_two reviews participant_one
  SELECT count(*) INTO v_existing_count
    FROM review_eligibility
    WHERE verified_collaboration_id = p_verified_collaboration_id
      AND reviewer_id = v_vc.participant_two_id
      AND reviewee_id = v_vc.participant_one_id;

  IF v_existing_count = 0 THEN
    INSERT INTO review_eligibility (verified_collaboration_id, reviewer_id, reviewee_id, eligibility_status, expires_at, calculation_version, generation_reason)
    VALUES (p_verified_collaboration_id, v_vc.participant_two_id, v_vc.participant_one_id, 'eligible', v_expires_at, v_calc_version, v_reason)
    RETURNING id INTO v_eligibility_id;

    v_generated_count := v_generated_count + 1;

    INSERT INTO trust_event_log (event_type, target_type, target_id, user_id, metadata, visibility)
    VALUES ('eligibility.generated', 'review_eligibility', v_eligibility_id::text, v_vc.participant_two_id,
            jsonb_build_object('reviewee_id', v_vc.participant_one_id, 'verified_collaboration_id', p_verified_collaboration_id, 'calculation_version', v_calc_version),
            'participant');

    INSERT INTO trust_audit_records (actor_type, decision_type, target_type, target_id, reason, new_state)
    VALUES ('system', 'eligibility.generate', 'review_eligibility', v_eligibility_id::text, v_reason,
            jsonb_build_object('reviewer_id', v_vc.participant_two_id, 'reviewee_id', v_vc.participant_one_id, 'expires_at', v_expires_at, 'calculation_version', v_calc_version, 'status', 'eligible'));
  END IF;

  RETURN v_generated_count;
END;
$$;

-- ============================================================
-- 3. Create private._expire_review_eligibility
--    Internal function. No public grants.
--    Processes only eligible records past expires_at.
-- ============================================================
CREATE OR REPLACE FUNCTION private._expire_review_eligibility()
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
      WHERE eligibility_status = 'eligible'
        AND expires_at <= now()
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

-- ============================================================
-- 4. Create public.admin_expire_review_eligibility
--    Admin-only wrapper. Checks is_admin() internally.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_expire_review_eligibility()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, pg_temp
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  RETURN private._expire_review_eligibility();
END;
$$;

-- ============================================================
-- 5. Replace public.admin_revoke_review_eligibility
--    Now validates is_admin(), non-empty reason, and only
--    revokes eligible or pending records.
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
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'Revocation reason must not be empty';
  END IF;

  SELECT id, reviewer_id, reviewee_id, eligibility_status, verified_collaboration_id
    INTO v_eligibility
    FROM review_eligibility
    WHERE id = p_eligibility_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review eligibility % does not exist', p_eligibility_id;
  END IF;

  IF v_eligibility.eligibility_status NOT IN ('eligible', 'pending') THEN
    RAISE EXCEPTION 'Cannot revoke review eligibility in status: %', v_eligibility.eligibility_status;
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
-- 6. Drop the insecure public.expire_review_eligibility
--    No duplicate insecure path remains.
-- ============================================================
DROP FUNCTION IF EXISTS public.expire_review_eligibility();

-- ============================================================
-- 7. Revoke unsafe execution grants
--    Only authenticated retains EXECUTE on public functions;
--    admin check is enforced internally.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.admin_expire_review_eligibility() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_review_eligibility(uuid, text) FROM PUBLIC, anon;