-- Correct the notification insert in create_collaboration_space. The
-- notifications table uses kind/text/link rather than legacy display fields.
CREATE OR REPLACE FUNCTION public.create_collaboration_space(
  p_opportunity_id uuid,
  p_name text,
  p_description text DEFAULT '',
  p_mission text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_owner_id uuid;
  v_visibility text;
  v_space_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF nullif(btrim(p_name), '') IS NULL THEN
    RAISE EXCEPTION 'A collaboration space name is required';
  END IF;

  SELECT owner_id, visibility
    INTO v_owner_id, v_visibility
  FROM public.opportunities
  WHERE id = p_opportunity_id;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Opportunity not found';
  END IF;

  IF v_owner_id <> v_actor_id AND v_visibility <> 'public' THEN
    RAISE EXCEPTION 'This opportunity is not open for direct collaboration';
  END IF;

  INSERT INTO public.collaboration_spaces (
    opportunity_id, name, description, mission
  ) VALUES (
    p_opportunity_id, btrim(p_name), coalesce(p_description, ''), coalesce(p_mission, '')
  )
  RETURNING id INTO v_space_id;

  INSERT INTO public.space_members (space_id, user_id, role)
  VALUES (v_space_id, v_owner_id, 'Lead');

  IF v_actor_id <> v_owner_id THEN
    INSERT INTO public.space_members (space_id, user_id, role)
    VALUES (v_space_id, v_actor_id, 'Contributor');

    INSERT INTO public.notifications (user_id, kind, text, link)
    VALUES (
      v_owner_id,
      'application',
      'A collaborator started a workspace for ' || btrim(p_name) || '.',
      'space:' || v_space_id::text
    );
  END IF;

  RETURN v_space_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_collaboration_space(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_collaboration_space(uuid, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_collaboration_space(uuid, text, text, text) TO authenticated;
