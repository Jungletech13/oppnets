/*
# Phase 3B.1 — Critical Security Containment

## Summary
1. Drops all Phase 3B RLS policies that reference profiles.is_admin
2. Drops profiles.is_admin column — removes the privilege-escalation path
3. Creates is_platform_admin() helper using auth.users.raw_app_meta_data->>'role'
4. Recreates all RLS policies with the new single authority
5. Strengthens collaboration_reviews INSERT to require valid eligibility
6. Replaces profiles UPDATE policy with safe version

## Authority model
- Single admin authority: auth.users.raw_app_meta_data->>'role' = 'admin'
- Client users cannot set raw_app_meta_data (only service-role or dashboard)
- Frontend AdminGuard uses user.app_metadata?.role (same source via JWT)
- All RLS policies use is_platform_admin() which checks the same source

## Safety
- No tables dropped, no data deleted
- profiles.is_admin had 0 rows with true — no data loss
*/

-- ============ 1. Drop ALL Phase 3B policies that reference profiles.is_admin ============

DROP POLICY IF EXISTS "select_reviews_v2" ON collaboration_reviews;

DROP POLICY IF EXISTS "insert_reviews_v2" ON collaboration_reviews;

DROP POLICY IF EXISTS "update_reviews_v2" ON collaboration_reviews;

DROP POLICY IF EXISTS "delete_reviews_v2" ON collaboration_reviews;


DROP POLICY IF EXISTS "select_own_eligibility" ON collaboration_review_eligibility;

DROP POLICY IF EXISTS "insert_own_eligibility" ON collaboration_review_eligibility;

DROP POLICY IF EXISTS "update_own_eligibility" ON collaboration_review_eligibility;

DROP POLICY IF EXISTS "delete_eligibility" ON collaboration_review_eligibility;


DROP POLICY IF EXISTS "select_review_scores" ON collaboration_review_scores;


DROP POLICY IF EXISTS "select_flags_admin" ON collaboration_review_flags;

DROP POLICY IF EXISTS "insert_flags_admin" ON collaboration_review_flags;

DROP POLICY IF EXISTS "update_flags_admin" ON collaboration_review_flags;


DROP POLICY IF EXISTS "select_disputes" ON collaboration_review_disputes;

DROP POLICY IF EXISTS "insert_disputes" ON collaboration_review_disputes;

DROP POLICY IF EXISTS "update_disputes_admin" ON collaboration_review_disputes;


DROP POLICY IF EXISTS "select_audit_admin" ON collaboration_review_audit;

DROP POLICY IF EXISTS "insert_audit" ON collaboration_review_audit;


DROP POLICY IF EXISTS "select_all_aggregates_public" ON reputation_aggregates;

DROP POLICY IF EXISTS "insert_aggregates_admin" ON reputation_aggregates;

DROP POLICY IF EXISTS "update_aggregates_admin" ON reputation_aggregates;


DROP POLICY IF EXISTS "select_badges_public" ON reputation_badges;

DROP POLICY IF EXISTS "insert_badges_admin" ON reputation_badges;

DROP POLICY IF EXISTS "update_badges_admin" ON reputation_badges;

DROP POLICY IF EXISTS "delete_badges_admin" ON reputation_badges;


DROP POLICY IF EXISTS "select_badge_history_admin" ON reputation_badge_history;

DROP POLICY IF EXISTS "insert_badge_history" ON reputation_badge_history;


DROP POLICY IF EXISTS "select_repeat_metrics_public" ON repeat_collaboration_metrics;

DROP POLICY IF EXISTS "insert_repeat_metrics_admin" ON repeat_collaboration_metrics;

DROP POLICY IF EXISTS "update_repeat_metrics_admin" ON repeat_collaboration_metrics;


DROP POLICY IF EXISTS "select_own_signals" ON recommendation_signals;

DROP POLICY IF EXISTS "insert_signals_admin" ON recommendation_signals;

DROP POLICY IF EXISTS "update_signals_admin" ON recommendation_signals;


DROP POLICY IF EXISTS "select_review_responses" ON review_responses;

DROP POLICY IF EXISTS "insert_review_responses" ON review_responses;

DROP POLICY IF EXISTS "update_review_responses" ON review_responses;


-- ============ 2. Drop profiles.is_admin column ============
ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;


-- ============ 3. Create helper function for admin check ============
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND raw_app_meta_data->>'role' = 'admin'
  );

$$;


-- ============ 4. Replace profiles UPDATE policy with safe version ============
DROP POLICY IF EXISTS "update_own_profile" ON profiles;

CREATE POLICY "update_own_profile_safe" ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- ============ 5. Recreate all RLS policies with is_platform_admin() ============

-- collaboration_reviews
CREATE POLICY "select_reviews_v2" ON collaboration_reviews FOR SELECT TO authenticated USING (
  review_status = 'published'
  OR reviewer_id = auth.uid()
  OR reviewee_id = auth.uid()
  OR is_platform_admin()
);


CREATE POLICY "insert_reviews_v2_verified" ON collaboration_reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND reviewer_id != reviewee_id
    AND EXISTS (
      SELECT 1 FROM collaboration_review_eligibility e
      WHERE e.reviewer_id = auth.uid()
        AND e.reviewee_id = collaboration_reviews.reviewee_id
        AND e.collaboration_ref_type = collaboration_reviews.collaboration_ref_type
        AND e.collaboration_ref_id = collaboration_reviews.collaboration_ref_id
        AND e.status IN ('eligible', 'invited')
        AND e.review_window_expires_at > now()
    )
    AND NOT EXISTS (
      SELECT 1 FROM collaboration_reviews r
      WHERE r.collaboration_ref_type = collaboration_reviews.collaboration_ref_type
        AND r.collaboration_ref_id = collaboration_reviews.collaboration_ref_id
        AND r.reviewer_id = collaboration_reviews.reviewer_id
        AND r.reviewee_id = collaboration_reviews.reviewee_id
        AND r.review_status NOT IN ('removed', 'expired')
    )
  );


CREATE POLICY "update_reviews_v2" ON collaboration_reviews FOR UPDATE TO authenticated USING (
  reviewer_id = auth.uid()
  AND review_status IN ('draft', 'submitted', 'held', 'disputed')
) WITH CHECK (
  reviewer_id = auth.uid()
  AND review_status IN ('draft', 'submitted', 'held', 'disputed')
);


CREATE POLICY "delete_reviews_v2" ON collaboration_reviews FOR DELETE TO authenticated USING (
  is_platform_admin()
);


-- collaboration_review_eligibility
CREATE POLICY "select_own_eligibility" ON collaboration_review_eligibility FOR SELECT TO authenticated USING (
  reviewer_id = auth.uid() OR reviewee_id = auth.uid()
  OR is_platform_admin()
);


CREATE POLICY "insert_own_eligibility" ON collaboration_review_eligibility FOR INSERT TO authenticated WITH CHECK (
  reviewer_id = auth.uid()
);


CREATE POLICY "update_own_eligibility" ON collaboration_review_eligibility FOR UPDATE TO authenticated USING (
  reviewer_id = auth.uid()
  OR is_platform_admin()
) WITH CHECK (
  reviewer_id = auth.uid()
  OR is_platform_admin()
);


CREATE POLICY "delete_eligibility" ON collaboration_review_eligibility FOR DELETE TO authenticated USING (
  is_platform_admin()
);


-- collaboration_review_scores
CREATE POLICY "select_review_scores" ON collaboration_review_scores FOR SELECT TO authenticated USING (
  is_published = true
  OR EXISTS (
    SELECT 1 FROM collaboration_reviews r
    WHERE r.id = collaboration_review_scores.review_id
      AND (r.reviewer_id = auth.uid() OR r.reviewee_id = auth.uid())
  )
  OR is_platform_admin()
);


-- collaboration_review_flags
CREATE POLICY "select_flags_admin" ON collaboration_review_flags FOR SELECT TO authenticated USING (
  is_platform_admin()
);


CREATE POLICY "insert_flags_admin" ON collaboration_review_flags FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IS NOT NULL
);


CREATE POLICY "update_flags_admin" ON collaboration_review_flags FOR UPDATE TO authenticated USING (
  is_platform_admin()
) WITH CHECK (
  is_platform_admin()
);


-- collaboration_review_disputes
CREATE POLICY "select_disputes" ON collaboration_review_disputes FOR SELECT TO authenticated USING (
  disputed_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM collaboration_reviews r
    WHERE r.id = collaboration_review_disputes.review_id AND r.reviewee_id = auth.uid()
  )
  OR is_platform_admin()
);


CREATE POLICY "insert_disputes" ON collaboration_review_disputes FOR INSERT TO authenticated WITH CHECK (
  disputed_by_id = auth.uid()
);


CREATE POLICY "update_disputes_admin" ON collaboration_review_disputes FOR UPDATE TO authenticated USING (
  is_platform_admin()
) WITH CHECK (
  is_platform_admin()
);


-- collaboration_review_audit
CREATE POLICY "select_audit_admin" ON collaboration_review_audit FOR SELECT TO authenticated USING (
  is_platform_admin()
);


CREATE POLICY "insert_audit" ON collaboration_review_audit FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IS NOT NULL
);


-- reputation_aggregates
CREATE POLICY "select_all_aggregates_public" ON reputation_aggregates FOR SELECT TO authenticated USING (true);


CREATE POLICY "insert_aggregates_admin" ON reputation_aggregates FOR INSERT TO authenticated WITH CHECK (
  is_platform_admin()
);


CREATE POLICY "update_aggregates_admin" ON reputation_aggregates FOR UPDATE TO authenticated USING (
  is_platform_admin()
) WITH CHECK (
  is_platform_admin()
);


-- reputation_badges
CREATE POLICY "select_badges_public" ON reputation_badges FOR SELECT TO authenticated USING (
  status = 'active'
  OR is_platform_admin()
);


CREATE POLICY "insert_badges_admin" ON reputation_badges FOR INSERT TO authenticated WITH CHECK (
  is_platform_admin()
);


CREATE POLICY "update_badges_admin" ON reputation_badges FOR UPDATE TO authenticated USING (
  is_platform_admin()
) WITH CHECK (
  is_platform_admin()
);


CREATE POLICY "delete_badges_admin" ON reputation_badges FOR DELETE TO authenticated USING (
  is_platform_admin()
);


-- reputation_badge_history
CREATE POLICY "select_badge_history_admin" ON reputation_badge_history FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR is_platform_admin()
);


CREATE POLICY "insert_badge_history" ON reputation_badge_history FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IS NOT NULL
);


-- repeat_collaboration_metrics
CREATE POLICY "select_repeat_metrics_public" ON repeat_collaboration_metrics FOR SELECT TO authenticated USING (true);


CREATE POLICY "insert_repeat_metrics_admin" ON repeat_collaboration_metrics FOR INSERT TO authenticated WITH CHECK (
  is_platform_admin()
);


CREATE POLICY "update_repeat_metrics_admin" ON repeat_collaboration_metrics FOR UPDATE TO authenticated USING (
  is_platform_admin()
) WITH CHECK (
  is_platform_admin()
);


-- recommendation_signals
CREATE POLICY "select_own_signals" ON recommendation_signals FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR is_platform_admin()
);


CREATE POLICY "insert_signals_admin" ON recommendation_signals FOR INSERT TO authenticated WITH CHECK (
  is_platform_admin()
);


CREATE POLICY "update_signals_admin" ON recommendation_signals FOR UPDATE TO authenticated USING (
  is_platform_admin()
) WITH CHECK (
  is_platform_admin()
);


-- review_responses
CREATE POLICY "select_review_responses" ON review_responses FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM collaboration_reviews r
    WHERE r.id = review_responses.review_id AND r.review_status = 'published'
  )
  OR author_id = auth.uid()
  OR is_platform_admin()
);


CREATE POLICY "insert_review_responses" ON review_responses FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM collaboration_reviews r
    WHERE r.id = review_responses.review_id AND r.reviewee_id = auth.uid()
  )
);


CREATE POLICY "update_review_responses" ON review_responses FOR UPDATE TO authenticated USING (
  author_id = auth.uid()
) WITH CHECK (
  author_id = auth.uid()
);

;
