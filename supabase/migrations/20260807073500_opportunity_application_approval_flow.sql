-- Trust-first opportunity applications. Applicants request access; only the
-- opportunity owner can accept or decline. Acceptance atomically creates the
-- collaboration space and both memberships.
CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunity_applications_one_pending
  ON public.opportunity_applications (opportunity_id, applicant_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.submit_opportunity_application(
  p_opportunity_id uuid,
  p_message text DEFAULT '',
  p_role_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_applicant_id uuid := auth.uid();
  v_owner_id uuid;
  v_title text;
  v_application_id uuid;
  v_applicant_name text;
BEGIN
  IF v_applicant_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  SELECT owner_id, title INTO v_owner_id, v_title
  FROM public.opportunities WHERE id = p_opportunity_id;

  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'Opportunity not found'; END IF;
  IF v_owner_id = v_applicant_id THEN RAISE EXCEPTION 'You own this opportunity'; END IF;
  IF p_role_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.opportunity_roles WHERE id = p_role_id AND opportunity_id = p_opportunity_id
  ) THEN RAISE EXCEPTION 'Selected role does not belong to this opportunity'; END IF;

  INSERT INTO public.opportunity_applications (opportunity_id, applicant_id, role_id, message)
  VALUES (p_opportunity_id, v_applicant_id, p_role_id, btrim(coalesce(p_message, '')))
  RETURNING id INTO v_application_id;

  SELECT nullif(btrim(name), '') INTO v_applicant_name FROM public.profiles WHERE id = v_applicant_id;
  INSERT INTO public.notifications (user_id, kind, text, link)
  VALUES (v_owner_id, 'application', coalesce(v_applicant_name, 'Someone') || ' applied to ' || v_title || '.', 'opportunity:' || p_opportunity_id::text);

  RETURN v_application_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'You already have a pending application for this opportunity';
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_opportunity_application(
  p_application_id uuid,
  p_decision text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id uuid := auth.uid();
  v_applicant_id uuid;
  v_opportunity_id uuid;
  v_title text;
  v_description text;
  v_space_id uuid;
BEGIN
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_decision NOT IN ('accepted', 'rejected') THEN RAISE EXCEPTION 'Decision must be accepted or rejected'; END IF;

  SELECT a.applicant_id, a.opportunity_id, o.title, o.description
    INTO v_applicant_id, v_opportunity_id, v_title, v_description
  FROM public.opportunity_applications a
  JOIN public.opportunities o ON o.id = a.opportunity_id
  WHERE a.id = p_application_id AND a.status = 'pending' AND o.owner_id = v_owner_id
  FOR UPDATE OF a;

  IF v_applicant_id IS NULL THEN RAISE EXCEPTION 'Pending application not found or not owned by you'; END IF;

  UPDATE public.opportunity_applications SET status = p_decision WHERE id = p_application_id;

  IF p_decision = 'accepted' THEN
    INSERT INTO public.collaboration_spaces (opportunity_id, name, description, mission)
    VALUES (v_opportunity_id, v_title, coalesce(v_description, ''), '')
    RETURNING id INTO v_space_id;

    INSERT INTO public.space_members (space_id, user_id, role)
    VALUES (v_space_id, v_owner_id, 'Lead'), (v_space_id, v_applicant_id, 'Contributor');

    INSERT INTO public.notifications (user_id, kind, text, link)
    VALUES (v_applicant_id, 'application', 'Your application to ' || v_title || ' was accepted.', 'space:' || v_space_id::text);
  ELSE
    INSERT INTO public.notifications (user_id, kind, text, link)
    VALUES (v_applicant_id, 'application', 'Your application to ' || v_title || ' was declined.', 'discover');
  END IF;

  RETURN v_space_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_opportunity_application(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_opportunity_application(uuid, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.decide_opportunity_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_opportunity_application(uuid, text) TO authenticated;
