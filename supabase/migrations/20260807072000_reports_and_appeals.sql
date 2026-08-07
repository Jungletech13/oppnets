Exit code: 0
Wall time: 1.2 seconds
Output:
/*
  # Persistent reports and appeals

  User submissions are private to the submitting user and administrators.
  Target IDs are intentionally polymorphic and are validated by target_type.
*/

CREATE TABLE IF NOT EXISTS public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('user', 'opportunity')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (char_length(btrim(decision)) BETWEEN 5 AND 500),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 3000),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_appeals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_reports" ON public.user_reports;
CREATE POLICY "select_own_reports" ON public.user_reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_reports" ON public.user_reports;
CREATE POLICY "insert_own_reports" ON public.user_reports FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "admin_update_reports" ON public.user_reports;
CREATE POLICY "admin_update_reports" ON public.user_reports FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "select_own_appeals" ON public.moderation_appeals;
CREATE POLICY "select_own_appeals" ON public.moderation_appeals FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_appeals" ON public.moderation_appeals;
CREATE POLICY "insert_own_appeals" ON public.moderation_appeals FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_update_appeals" ON public.moderation_appeals;
CREATE POLICY "admin_update_appeals" ON public.moderation_appeals FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter_created ON public.user_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON public.user_reports(status);
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_user_created ON public.moderation_appeals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_status ON public.moderation_appeals(status);

REVOKE ALL ON public.user_reports FROM anon;
REVOKE ALL ON public.moderation_appeals FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.user_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.moderation_appeals TO authenticated;

