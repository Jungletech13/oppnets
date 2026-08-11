/*
  Persist Collaboration Space operations that were previously client-only.
  These records remain workspace evidence; this migration does not write to or
  calculate any Trust Layer result.
*/

ALTER TABLE public.collaboration_spaces
  ADD COLUMN IF NOT EXISTS modules jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.collaboration_record_acknowledgments (
  space_id uuid NOT NULL REFERENCES public.collaboration_spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);

ALTER TABLE public.collaboration_record_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_member_record_acknowledgments" ON public.collaboration_record_acknowledgments;
CREATE POLICY "select_member_record_acknowledgments"
ON public.collaboration_record_acknowledgments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.space_members sm
    WHERE sm.space_id = collaboration_record_acknowledgments.space_id
      AND sm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "insert_own_record_acknowledgment" ON public.collaboration_record_acknowledgments;
CREATE POLICY "insert_own_record_acknowledgment"
ON public.collaboration_record_acknowledgments
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.space_members sm
    WHERE sm.space_id = collaboration_record_acknowledgments.space_id
      AND sm.user_id = auth.uid()
  )
);

-- A space has one logical team conversation. Creation and the first message
-- are atomic, and participants are derived from server-side membership.
CREATE OR REPLACE FUNCTION public.create_space_conversation(
  p_space_id uuid,
  p_title text,
  p_initial_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_conversation_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF length(btrim(coalesce(p_initial_message, ''))) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.space_members
    WHERE space_id = p_space_id AND user_id = v_actor_id
  ) THEN
    RAISE EXCEPTION 'Collaboration Space membership required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_space_id::text, 0));

  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE type = 'space' AND space_id = p_space_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations(type, space_id, title)
    VALUES('space', p_space_id, left(btrim(coalesce(p_title, 'Team conversation')), 200))
    RETURNING id INTO v_conversation_id;

  END IF;

  -- Reconcile participants every time so members added after the conversation
  -- was created can read and contribute to the same team thread.
  INSERT INTO public.conversation_participants(conversation_id, user_id)
  SELECT v_conversation_id, sm.user_id
  FROM public.space_members sm
  WHERE sm.space_id = p_space_id
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  INSERT INTO public.messages(conversation_id, author_id, text)
  VALUES(v_conversation_id, v_actor_id, btrim(p_initial_message));

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_space_conversation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_space_conversation(uuid, text, text) TO authenticated;
