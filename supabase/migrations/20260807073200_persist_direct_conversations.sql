-- Atomically create a direct conversation, its participants, initial message,
-- and a recipient notification without weakening table-level RLS policies.
CREATE OR REPLACE FUNCTION public.create_direct_conversation(
  p_recipient_id uuid,
  p_title text,
  p_initial_message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_conversation_id uuid;
  v_sender_name text;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF p_recipient_id IS NULL OR p_recipient_id = v_sender_id THEN
    RAISE EXCEPTION 'A different recipient is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
    RAISE EXCEPTION 'Recipient profile not found';
  END IF;
  IF length(btrim(coalesce(p_initial_message, ''))) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  INSERT INTO public.conversations (type, title)
  VALUES ('direct', left(btrim(coalesce(p_title, 'Direct conversation')), 200))
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  VALUES
    (v_conversation_id, v_sender_id),
    (v_conversation_id, p_recipient_id);

  INSERT INTO public.messages (conversation_id, author_id, text)
  VALUES (v_conversation_id, v_sender_id, btrim(p_initial_message));

  SELECT nullif(btrim(name), '') INTO v_sender_name
  FROM public.profiles
  WHERE id = v_sender_id;

  INSERT INTO public.notifications (user_id, kind, text, link)
  VALUES (
    p_recipient_id,
    'message',
    coalesce(v_sender_name, 'Someone') || ' sent you a message.',
    '#/messages'
  );

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_direct_conversation(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, text, text) TO authenticated;
