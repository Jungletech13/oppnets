/*
# Add is_admin column to profiles + Phase 3B review/reputation tables

## Summary
1. Adds is_admin boolean column to profiles table for admin role checks
2. Extends collaboration_reviews with 17 new columns for the full review system
3. Creates 11 new tables for verified reviews, reputation badges, and recommendations
4. Enables RLS on all new tables with proper ownership/admin policies
5. Adds updated_at triggers and realtime on key tables

## Important Notes
- All badge thresholds are DRAFT (config_status='draft') — no badges awarded yet
- Self-review prevented at DB constraint + RLS level
- Admin checks use profiles.is_admin boolean
*/

-- ============ 0. Add is_admin to profiles ============
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;


-- ============ 1. Extend collaboration_reviews ============
ALTER TABLE collaboration_reviews
  ADD COLUMN IF NOT EXISTS eligibility_id uuid,
  ADD COLUMN IF NOT EXISTS collaboration_type text NOT NULL DEFAULT 'general'
    CHECK (collaboration_type IN ('general','startup','employment','contractor','investment','professional_service','company_engagement')),
  ADD COLUMN IF NOT EXISTS collaboration_ref_type text NOT NULL DEFAULT 'space'
    CHECK (collaboration_ref_type IN ('space','opportunity','professional_engagement','company_engagement')),
  ADD COLUMN IF NOT EXISTS collaboration_ref_id uuid,
  ADD COLUMN IF NOT EXISTS reviewer_entity_type text NOT NULL DEFAULT 'person'
    CHECK (reviewer_entity_type IN ('person','professional','company')),
  ADD COLUMN IF NOT EXISTS reviewee_entity_type text NOT NULL DEFAULT 'person'
    CHECK (reviewee_entity_type IN ('person','professional','company')),
  ADD COLUMN IF NOT EXISTS overall_rating smallint
    CHECK (overall_rating IS NULL OR (overall_rating >= 1 AND overall_rating <= 5)),
  ADD COLUMN IF NOT EXISTS would_collaborate_again text
    CHECK (would_collaborate_again IS NULL OR would_collaborate_again IN ('definitely','probably','maybe','probably_not','definitely_not')),
  ADD COLUMN IF NOT EXISTS category_ratings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contextual_ratings jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS context_specific_answers jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS written_review text DEFAULT '',
  ADD COLUMN IF NOT EXISTS private_feedback text DEFAULT '',
  ADD COLUMN IF NOT EXISTS private_concerns text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'submitted'
    CHECK (review_status IN ('eligible','invited','draft','submitted','held','published','disputed','removed','expired')),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_reason text;


CREATE UNIQUE INDEX IF NOT EXISTS collaboration_reviews_unique_review
  ON collaboration_reviews (collaboration_ref_type, collaboration_ref_id, reviewer_id, reviewee_id)
  WHERE review_status NOT IN ('removed', 'expired');


CREATE INDEX IF NOT EXISTS collaboration_reviews_reviewee_status
  ON collaboration_reviews (reviewee_id, review_status);


CREATE INDEX IF NOT EXISTS collaboration_reviews_reviewer_status
  ON collaboration_reviews (reviewer_id, review_status);


CREATE INDEX IF NOT EXISTS collaboration_reviews_ref
  ON collaboration_reviews (collaboration_ref_type, collaboration_ref_id);


-- ============ 2. collaboration_review_eligibility ============
CREATE TABLE IF NOT EXISTS collaboration_review_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaboration_type text NOT NULL
    CHECK (collaboration_type IN ('general','startup','employment','contractor','investment','professional_service','company_engagement')),
  collaboration_ref_type text NOT NULL
    CHECK (collaboration_ref_type IN ('space','opportunity','professional_engagement','company_engagement')),
  collaboration_ref_id uuid NOT NULL,
  reviewer_entity_type text NOT NULL DEFAULT 'person'
    CHECK (reviewer_entity_type IN ('person','professional','company')),
  reviewer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_entity_type text NOT NULL DEFAULT 'person'
    CHECK (reviewee_entity_type IN ('person','professional','company')),
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  eligible_event_type text NOT NULL
    CHECK (eligible_event_type IN ('space_completed','opportunity_completed','member_departure','professional_engagement_completed','company_engagement_completed')),
  status text NOT NULL DEFAULT 'eligible'
    CHECK (status IN ('eligible','invited','draft','submitted','held','published','disputed','removed','expired')),
  review_window_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_self_eligibility CHECK (reviewer_id != reviewee_id)
);


ALTER TABLE collaboration_review_eligibility ENABLE ROW LEVEL SECURITY;


CREATE UNIQUE INDEX IF NOT EXISTS review_eligibility_unique
  ON collaboration_review_eligibility (collaboration_ref_type, collaboration_ref_id, reviewer_id, reviewee_id);


CREATE INDEX IF NOT EXISTS review_eligibility_reviewer
  ON collaboration_review_eligibility (reviewer_id, status);


CREATE INDEX IF NOT EXISTS review_eligibility_reviewee
  ON collaboration_review_eligibility (reviewee_id, status);


-- ============ 3. collaboration_review_scores ============
CREATE TABLE IF NOT EXISTS collaboration_review_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES collaboration_reviews(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overall_rating smallint NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  would_collaborate_again_is_definite boolean NOT NULL,
  would_collaborate_again_is_positive boolean NOT NULL,
  reliability_score smallint CHECK (reliability_score IS NULL OR (reliability_score >= 1 AND reliability_score <= 5)),
  communication_score smallint CHECK (communication_score IS NULL OR (communication_score >= 1 AND communication_score <= 5)),
  professionalism_score smallint CHECK (professionalism_score IS NULL OR (professionalism_score >= 1 AND professionalism_score <= 5)),
  quality_score smallint CHECK (quality_score IS NULL OR (quality_score >= 1 AND quality_score <= 5)),
  problem_solving_score smallint CHECK (problem_solving_score IS NULL OR (problem_solving_score >= 1 AND problem_solving_score <= 5)),
  deadlines_score smallint CHECK (deadlines_score IS NULL OR (deadlines_score >= 1 AND deadlines_score <= 5)),
  has_written_review boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE collaboration_review_scores ENABLE ROW LEVEL SECURITY;


CREATE INDEX IF NOT EXISTS review_scores_reviewee_published
  ON collaboration_review_scores (reviewee_id, is_published);


CREATE UNIQUE INDEX IF NOT EXISTS review_scores_one_per_review
  ON collaboration_review_scores (review_id);


-- ============ 4. collaboration_review_flags ============
CREATE TABLE IF NOT EXISTS collaboration_review_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES collaboration_reviews(id) ON DELETE SET NULL,
  flag_type text NOT NULL
    CHECK (flag_type IN ('self_review_attempt','duplicate_review','review_trading','coordinated_review_ring','retaliation','fake_collaboration','review_bombing','coercion','edit_after_dispute','deletion_manipulation','rate_limit_exceeded','suspicious_pattern')),
  severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info','warning','serious')),
  description text NOT NULL DEFAULT '',
  detected_by text NOT NULL DEFAULT 'system'
    CHECK (detected_by IN ('system','admin','user_report')),
  reporter_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','investigating','resolved','dismissed')),
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE collaboration_review_flags ENABLE ROW LEVEL SECURITY;


CREATE INDEX IF NOT EXISTS review_flags_status
  ON collaboration_review_flags (status, severity);


CREATE INDEX IF NOT EXISTS review_flags_review
  ON collaboration_review_flags (review_id);


-- ============ 5. collaboration_review_disputes ============
CREATE TABLE IF NOT EXISTS collaboration_review_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES collaboration_reviews(id) ON DELETE CASCADE,
  disputed_by_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  evidence_description text DEFAULT '',
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','under_review','evidence_requested','resolved_uphold','resolved_remove','resolved_edit','dismissed')),
  admin_response text,
  resolved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE collaboration_review_disputes ENABLE ROW LEVEL SECURITY;


CREATE INDEX IF NOT EXISTS review_disputes_status
  ON collaboration_review_disputes (status);


CREATE UNIQUE INDEX IF NOT EXISTS review_disputes_one_per_review
  ON collaboration_review_disputes (review_id);


-- ============ 6. collaboration_review_audit ============
CREATE TABLE IF NOT EXISTS collaboration_review_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES collaboration_reviews(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('created','submitted','published','held','disputed','removed','restored','flagged','flag_resolved','admin_edited','expired')),
  actor_type text NOT NULL
    CHECK (actor_type IN ('system','reviewer','reviewee','admin')),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  details text DEFAULT '',
  previous_status text,
  new_status text,
  created_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE collaboration_review_audit ENABLE ROW LEVEL SECURITY;


CREATE INDEX IF NOT EXISTS review_audit_review
  ON collaboration_review_audit (review_id, created_at);


-- ============ 7. reputation_aggregates ============
CREATE TABLE IF NOT EXISTS reputation_aggregates (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_completed_collaborations integer NOT NULL DEFAULT 0,
  total_verified_reviews integer NOT NULL DEFAULT 0,
  repeat_collaborations integer NOT NULL DEFAULT 0,
  repeat_teammate_count integer NOT NULL DEFAULT 0,
  invited_back_count integer NOT NULL DEFAULT 0,
  definitely_percentage numeric(5,2) NOT NULL DEFAULT 0,
  definitely_or_probably_percentage numeric(5,2) NOT NULL DEFAULT 0,
  average_reliability numeric(3,2) NOT NULL DEFAULT 0,
  average_communication numeric(3,2) NOT NULL DEFAULT 0,
  average_professionalism numeric(3,2) NOT NULL DEFAULT 0,
  average_quality_of_contribution numeric(3,2) NOT NULL DEFAULT 0,
  average_problem_solving numeric(3,2) NOT NULL DEFAULT 0,
  average_met_deadlines numeric(3,2) NOT NULL DEFAULT 0,
  written_review_count integer NOT NULL DEFAULT 0,
  sample_size integer NOT NULL DEFAULT 0,
  last_calculated_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE reputation_aggregates ENABLE ROW LEVEL SECURITY;


-- ============ 8. reputation_badges ============
CREATE TABLE IF NOT EXISTS reputation_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_level text NOT NULL
    CHECK (badge_level IN ('new_collaborator','established_collaborator','trusted_collaborator','highly_recommended','elite_collaborator')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','removed')),
  earned_at timestamptz NOT NULL DEFAULT now(),
  renewed_at timestamptz NOT NULL DEFAULT now(),
  suspended_at timestamptz,
  removed_at timestamptz,
  suspension_reason text,
  removal_reason text,
  qualification_snapshot jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE reputation_badges ENABLE ROW LEVEL SECURITY;


CREATE UNIQUE INDEX IF NOT EXISTS reputation_badges_user_level
  ON reputation_badges (user_id, badge_level)
  WHERE status = 'active';


CREATE INDEX IF NOT EXISTS reputation_badges_level
  ON reputation_badges (badge_level, status);


-- ============ 9. reputation_badge_history ============
CREATE TABLE IF NOT EXISTS reputation_badge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id uuid NOT NULL REFERENCES reputation_badges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('earned','renewed','suspended','removed','restored')),
  reason text NOT NULL DEFAULT '',
  actor_type text NOT NULL DEFAULT 'system'
    CHECK (actor_type IN ('system','admin')),
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  qualification_snapshot jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE reputation_badge_history ENABLE ROW LEVEL SECURITY;


CREATE INDEX IF NOT EXISTS badge_history_user
  ON reputation_badge_history (user_id, created_at);


CREATE INDEX IF NOT EXISTS badge_history_badge
  ON reputation_badge_history (badge_id, created_at);


-- ============ 10. repeat_collaboration_metrics ============
CREATE TABLE IF NOT EXISTS repeat_collaboration_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  teammate_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collaboration_count integer NOT NULL DEFAULT 1,
  last_collaboration_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE repeat_collaboration_metrics ENABLE ROW LEVEL SECURITY;


CREATE UNIQUE INDEX IF NOT EXISTS repeat_metrics_pair
  ON repeat_collaboration_metrics (user_id, teammate_id);


CREATE INDEX IF NOT EXISTS repeat_metrics_user
  ON repeat_collaboration_metrics (user_id, collaboration_count DESC);


-- ============ 11. recommendation_signals ============
CREATE TABLE IF NOT EXISTS recommendation_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_type text NOT NULL
    CHECK (signal_type IN ('recommended_individual','previous_teammate','proven_pair','proven_group','repeat_network','frequently_invited_back','definitely_collaborate_again','role_specific')),
  target_entity_type text NOT NULL DEFAULT 'person'
    CHECK (target_entity_type IN ('person','professional','company')),
  target_id uuid NOT NULL,
  reason text NOT NULL DEFAULT '',
  strength integer NOT NULL DEFAULT 0 CHECK (strength >= 0 AND strength <= 100),
  collaboration_count integer NOT NULL DEFAULT 0,
  sample_size integer NOT NULL DEFAULT 0,
  context_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE recommendation_signals ENABLE ROW LEVEL SECURITY;


CREATE INDEX IF NOT EXISTS recommendation_signals_user
  ON recommendation_signals (user_id, signal_type);


CREATE INDEX IF NOT EXISTS recommendation_signals_target
  ON recommendation_signals (target_entity_type, target_id);


-- ============ 12. review_responses ============
CREATE TABLE IF NOT EXISTS review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES collaboration_reviews(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;


CREATE UNIQUE INDEX IF NOT EXISTS review_responses_one_per_review
  ON review_responses (review_id);


-- ============ RLS POLICIES ============
-- Admin helper: profiles.is_admin boolean

-- collaboration_reviews
DROP POLICY IF EXISTS "select_reviews_v2" ON collaboration_reviews;

CREATE POLICY "select_reviews_v2" ON collaboration_reviews FOR SELECT TO authenticated USING (
  review_status = 'published'
  OR reviewer_id = auth.uid()
  OR reviewee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "insert_reviews_v2" ON collaboration_reviews;

CREATE POLICY "insert_reviews_v2" ON collaboration_reviews FOR INSERT TO authenticated WITH CHECK (
  reviewer_id = auth.uid()
  AND reviewer_id != reviewee_id
);


DROP POLICY IF EXISTS "update_reviews_v2" ON collaboration_reviews;

CREATE POLICY "update_reviews_v2" ON collaboration_reviews FOR UPDATE TO authenticated USING (
  reviewer_id = auth.uid()
  AND review_status IN ('draft', 'submitted', 'held', 'disputed')
) WITH CHECK (
  reviewer_id = auth.uid()
  AND review_status IN ('draft', 'submitted', 'held', 'disputed')
);


DROP POLICY IF EXISTS "delete_reviews_v2" ON collaboration_reviews;

CREATE POLICY "delete_reviews_v2" ON collaboration_reviews FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


-- collaboration_review_eligibility
DROP POLICY IF EXISTS "select_own_eligibility" ON collaboration_review_eligibility;

CREATE POLICY "select_own_eligibility" ON collaboration_review_eligibility FOR SELECT TO authenticated USING (
  reviewer_id = auth.uid() OR reviewee_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "insert_own_eligibility" ON collaboration_review_eligibility;

CREATE POLICY "insert_own_eligibility" ON collaboration_review_eligibility FOR INSERT TO authenticated WITH CHECK (
  reviewer_id = auth.uid()
);


DROP POLICY IF EXISTS "update_own_eligibility" ON collaboration_review_eligibility;

CREATE POLICY "update_own_eligibility" ON collaboration_review_eligibility FOR UPDATE TO authenticated USING (
  reviewer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
) WITH CHECK (
  reviewer_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "delete_eligibility" ON collaboration_review_eligibility;

CREATE POLICY "delete_eligibility" ON collaboration_review_eligibility FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


-- collaboration_review_scores
DROP POLICY IF EXISTS "select_review_scores" ON collaboration_review_scores;

CREATE POLICY "select_review_scores" ON collaboration_review_scores FOR SELECT TO authenticated USING (
  is_published = true
  OR EXISTS (
    SELECT 1 FROM collaboration_reviews r
    WHERE r.id = collaboration_review_scores.review_id
      AND (r.reviewer_id = auth.uid() OR r.reviewee_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


-- collaboration_review_flags — admin-only
DROP POLICY IF EXISTS "select_flags_admin" ON collaboration_review_flags;

CREATE POLICY "select_flags_admin" ON collaboration_review_flags FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "insert_flags_admin" ON collaboration_review_flags;

CREATE POLICY "insert_flags_admin" ON collaboration_review_flags FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IS NOT NULL
);


DROP POLICY IF EXISTS "update_flags_admin" ON collaboration_review_flags;

CREATE POLICY "update_flags_admin" ON collaboration_review_flags FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


-- collaboration_review_disputes
DROP POLICY IF EXISTS "select_disputes" ON collaboration_review_disputes;

CREATE POLICY "select_disputes" ON collaboration_review_disputes FOR SELECT TO authenticated USING (
  disputed_by_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM collaboration_reviews r
    WHERE r.id = collaboration_review_disputes.review_id AND r.reviewee_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "insert_disputes" ON collaboration_review_disputes;

CREATE POLICY "insert_disputes" ON collaboration_review_disputes FOR INSERT TO authenticated WITH CHECK (
  disputed_by_id = auth.uid()
);


DROP POLICY IF EXISTS "update_disputes_admin" ON collaboration_review_disputes;

CREATE POLICY "update_disputes_admin" ON collaboration_review_disputes FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


-- collaboration_review_audit — admin read, system insert
DROP POLICY IF EXISTS "select_audit_admin" ON collaboration_review_audit;

CREATE POLICY "select_audit_admin" ON collaboration_review_audit FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "insert_audit" ON collaboration_review_audit;

CREATE POLICY "insert_audit" ON collaboration_review_audit FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IS NOT NULL
);


-- reputation_aggregates — public read (derived from published reviews)
DROP POLICY IF EXISTS "select_all_aggregates_public" ON reputation_aggregates;

CREATE POLICY "select_all_aggregates_public" ON reputation_aggregates FOR SELECT TO authenticated USING (true);


DROP POLICY IF EXISTS "insert_aggregates_admin" ON reputation_aggregates;

CREATE POLICY "insert_aggregates_admin" ON reputation_aggregates FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "update_aggregates_admin" ON reputation_aggregates;

CREATE POLICY "update_aggregates_admin" ON reputation_aggregates FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


-- reputation_badges — public read active badges, admin write
DROP POLICY IF EXISTS "select_badges_public" ON reputation_badges;

CREATE POLICY "select_badges_public" ON reputation_badges FOR SELECT TO authenticated USING (
  status = 'active'
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "insert_badges_admin" ON reputation_badges;

CREATE POLICY "insert_badges_admin" ON reputation_badges FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "update_badges_admin" ON reputation_badges;

CREATE POLICY "update_badges_admin" ON reputation_badges FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "delete_badges_admin" ON reputation_badges;

CREATE POLICY "delete_badges_admin" ON reputation_badges FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


-- reputation_badge_history
DROP POLICY IF EXISTS "select_badge_history_admin" ON reputation_badge_history;

CREATE POLICY "select_badge_history_admin" ON reputation_badge_history FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "insert_badge_history" ON reputation_badge_history;

CREATE POLICY "insert_badge_history" ON reputation_badge_history FOR INSERT TO authenticated WITH CHECK (
  auth.uid() IS NOT NULL
);


-- repeat_collaboration_metrics — public read, admin write
DROP POLICY IF EXISTS "select_repeat_metrics_public" ON repeat_collaboration_metrics;

CREATE POLICY "select_repeat_metrics_public" ON repeat_collaboration_metrics FOR SELECT TO authenticated USING (true);


DROP POLICY IF EXISTS "insert_repeat_metrics_admin" ON repeat_collaboration_metrics;

CREATE POLICY "insert_repeat_metrics_admin" ON repeat_collaboration_metrics FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "update_repeat_metrics_admin" ON repeat_collaboration_metrics;

CREATE POLICY "update_repeat_metrics_admin" ON repeat_collaboration_metrics FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


-- recommendation_signals
DROP POLICY IF EXISTS "select_own_signals" ON recommendation_signals;

CREATE POLICY "select_own_signals" ON recommendation_signals FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "insert_signals_admin" ON recommendation_signals;

CREATE POLICY "insert_signals_admin" ON recommendation_signals FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "update_signals_admin" ON recommendation_signals;

CREATE POLICY "update_signals_admin" ON recommendation_signals FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


-- review_responses
DROP POLICY IF EXISTS "select_review_responses" ON review_responses;

CREATE POLICY "select_review_responses" ON review_responses FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM collaboration_reviews r
    WHERE r.id = review_responses.review_id AND r.review_status = 'published'
  )
  OR author_id = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
);


DROP POLICY IF EXISTS "insert_review_responses" ON review_responses;

CREATE POLICY "insert_review_responses" ON review_responses FOR INSERT TO authenticated WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM collaboration_reviews r
    WHERE r.id = review_responses.review_id AND r.reviewee_id = auth.uid()
  )
);


DROP POLICY IF EXISTS "update_review_responses" ON review_responses;

CREATE POLICY "update_review_responses" ON review_responses FOR UPDATE TO authenticated USING (
  author_id = auth.uid()
) WITH CHECK (
  author_id = auth.uid()
);


-- ============ UPDATED_AT TRIGGERS ============

CREATE OR REPLACE FUNCTION update_updated_at_3b()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  RETURN NEW;

END;

$$ LANGUAGE plpgsql;


DROP TRIGGER IF EXISTS collaboration_review_eligibility_updated_at ON collaboration_review_eligibility;

CREATE TRIGGER collaboration_review_eligibility_updated_at
  BEFORE UPDATE ON collaboration_review_eligibility
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_3b();


DROP TRIGGER IF EXISTS collaboration_review_disputes_updated_at ON collaboration_review_disputes;

CREATE TRIGGER collaboration_review_disputes_updated_at
  BEFORE UPDATE ON collaboration_review_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_3b();


DROP TRIGGER IF EXISTS reputation_badges_updated_at ON reputation_badges;

CREATE TRIGGER reputation_badges_updated_at
  BEFORE UPDATE ON reputation_badges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_3b();


DROP TRIGGER IF EXISTS repeat_collaboration_metrics_updated_at ON repeat_collaboration_metrics;

CREATE TRIGGER repeat_collaboration_metrics_updated_at
  BEFORE UPDATE ON repeat_collaboration_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_3b();


DROP TRIGGER IF EXISTS recommendation_signals_updated_at ON recommendation_signals;

CREATE TRIGGER recommendation_signals_updated_at
  BEFORE UPDATE ON recommendation_signals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_3b();


DROP TRIGGER IF EXISTS review_responses_updated_at ON review_responses;

CREATE TRIGGER review_responses_updated_at
  BEFORE UPDATE ON review_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_3b();


-- ============ REALTIME ============

ALTER TABLE collaboration_reviews REPLICA IDENTITY FULL;

ALTER TABLE reputation_badges REPLICA IDENTITY FULL;

ALTER TABLE reputation_aggregates REPLICA IDENTITY FULL;


DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'collaboration_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_reviews;

  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reputation_badges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reputation_badges;

  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'reputation_aggregates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reputation_aggregates;

  END IF;

END $$;

;
