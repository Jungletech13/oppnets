-- Revenue-aligned introductions and application limits.
-- A paid introduction opens one direct conversation. Replies remain included so
-- both parties have an incentive to preserve their protection record in OppNets.

WITH limits(plan_tier, key, value, label, category, sort_order) AS (
  VALUES
    ('builder-free', 'max_applications', '2', 'Applications per month', 'limits', 20),
    ('builder-free', 'max_introductions_per_month', '0', 'Included introductions per month', 'limits', 25),
    ('builder-pro', 'max_applications', '15', 'Applications per month', 'limits', 20),
    ('builder-pro', 'max_introductions_per_month', '20', 'Included introductions per month', 'limits', 25),
    ('professional', 'max_applications', '40', 'Applications per month', 'limits', 20),
    ('professional', 'max_introductions_per_month', '75', 'Included introductions per month', 'limits', 25),
    ('company', 'max_applications', '100', 'Applications per month', 'limits', 20),
    ('company', 'max_introductions_per_month', '200', 'Included introductions per month', 'limits', 25)
)
INSERT INTO public.plan_entitlements(plan_tier, key, value, label, category, sort_order)
SELECT plan_tier, key, value, label, category, sort_order FROM limits
ON CONFLICT(plan_tier, key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.billing_price_catalog
  (price_key, display_name, product_type, plan_slug, amount_cents, billing_interval, stripe_price_id, active)
VALUES
  ('introduction-single', 'Verified Introduction', 'addon', NULL, 400, 'one_time', 'price_1U2eVS1xIwdmLTszUPPnNkMy', true),
  ('introduction-pack-5', 'Introduction Pack - 5', 'addon', NULL, 1500, 'one_time', 'price_1U2eVz1xIwdmLTszouguEwJ4', true)
ON CONFLICT(price_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  amount_cents = EXCLUDED.amount_cents,
  billing_interval = EXCLUDED.billing_interval,
  stripe_price_id = EXCLUDED.stripe_price_id,
  active = EXCLUDED.active;

CREATE TABLE IF NOT EXISTS public.introduction_credit_balances (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.introduction_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount <> 0),
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, source)
);

ALTER TABLE public.introduction_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.introduction_credit_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY introduction_balances_select_own ON public.introduction_credit_balances
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY introduction_ledger_select_own ON public.introduction_credit_ledger
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.introduction_credit_balances FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.introduction_credit_ledger FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.introduction_credit_balances TO authenticated;
GRANT SELECT ON public.introduction_credit_ledger TO authenticated;

CREATE OR REPLACE FUNCTION public.grant_introduction_credits(
  p_user_id uuid,
  p_amount integer,
  p_source text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_user_id IS NULL OR p_amount < 1 OR nullif(btrim(p_source), '') IS NULL THEN
    RAISE EXCEPTION 'Invalid introduction credit grant';
  END IF;
  INSERT INTO public.introduction_credit_ledger(user_id, amount, source)
  VALUES(p_user_id, p_amount, p_source)
  ON CONFLICT(user_id, source) DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.introduction_credit_balances(user_id, balance)
    VALUES(p_user_id, p_amount)
    ON CONFLICT(user_id) DO UPDATE SET
      balance = introduction_credit_balances.balance + EXCLUDED.balance,
      updated_at = now();
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_introduction_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_opportunity_application(
  p_opportunity_id uuid,
  p_message text DEFAULT '',
  p_role_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_applicant_id uuid := auth.uid();
  v_owner_id uuid;
  v_title text;
  v_application_id uuid;
  v_applicant_name text;
  v_limit integer;
  v_used integer;
BEGIN
  IF v_applicant_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  SELECT owner_id, title INTO v_owner_id, v_title FROM public.opportunities WHERE id = p_opportunity_id;
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'Opportunity not found'; END IF;
  IF v_owner_id = v_applicant_id THEN RAISE EXCEPTION 'You own this opportunity'; END IF;
  IF p_role_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.opportunity_roles WHERE id = p_role_id AND opportunity_id = p_opportunity_id
  ) THEN RAISE EXCEPTION 'Selected role does not belong to this opportunity'; END IF;

  v_limit := COALESCE((public.current_user_entitlements(v_applicant_id)->>'max_applications')::integer, 0);
  SELECT count(*) INTO v_used FROM public.opportunity_applications
  WHERE applicant_id = v_applicant_id AND applied_at >= date_trunc('month', now());
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Monthly application limit reached (%). Upgrade to apply to more opportunities.', v_limit;
  END IF;

  INSERT INTO public.opportunity_applications(opportunity_id, applicant_id, role_id, message)
  VALUES(p_opportunity_id, v_applicant_id, p_role_id, btrim(coalesce(p_message, '')))
  RETURNING id INTO v_application_id;
  SELECT nullif(btrim(name), '') INTO v_applicant_name FROM public.profiles WHERE id = v_applicant_id;
  INSERT INTO public.notifications(user_id, kind, text, link)
  VALUES(v_owner_id, 'application', coalesce(v_applicant_name, 'Someone') || ' applied to ' || v_title || '.', 'opportunity:' || p_opportunity_id::text);
  RETURN v_application_id;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'You already have a pending application for this opportunity';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_direct_conversation(
  p_recipient_id uuid,
  p_title text,
  p_initial_message text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_conversation_id uuid;
  v_sender_name text;
  v_limit integer;
  v_used integer;
  v_period date := date_trunc('month', now())::date;
BEGIN
  IF v_sender_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_recipient_id IS NULL OR p_recipient_id = v_sender_id THEN RAISE EXCEPTION 'A different recipient is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN RAISE EXCEPTION 'Recipient profile not found'; END IF;
  IF length(btrim(coalesce(p_initial_message, ''))) = 0 THEN RAISE EXCEPTION 'Message cannot be empty'; END IF;

  v_limit := COALESCE((public.current_user_entitlements(v_sender_id)->>'max_introductions_per_month')::integer, 0);
  IF v_limit > 0 THEN
    INSERT INTO public.usage_counters(user_id, metric_key, period_start, usage_count)
    VALUES(v_sender_id, 'introductions', v_period, 1)
    ON CONFLICT(user_id, metric_key, period_start) DO UPDATE SET
      usage_count = usage_counters.usage_count + 1,
      updated_at = now()
    WHERE usage_counters.usage_count < v_limit
    RETURNING usage_count INTO v_used;
  END IF;

  IF NOT FOUND THEN
    UPDATE public.introduction_credit_balances
    SET balance = balance - 1, updated_at = now()
    WHERE user_id = v_sender_id AND balance > 0;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'An introduction credit is required. Purchase one introduction or upgrade your plan.';
    END IF;
    INSERT INTO public.introduction_credit_ledger(user_id, amount, source)
    VALUES(v_sender_id, -1, 'conversation:' || gen_random_uuid()::text);
  END IF;

  INSERT INTO public.conversations(type, title)
  VALUES('direct', left(btrim(coalesce(p_title, 'Direct conversation')), 200))
  RETURNING id INTO v_conversation_id;
  INSERT INTO public.conversation_participants(conversation_id, user_id)
  VALUES(v_conversation_id, v_sender_id), (v_conversation_id, p_recipient_id);
  INSERT INTO public.messages(conversation_id, author_id, text)
  VALUES(v_conversation_id, v_sender_id, btrim(p_initial_message));
  SELECT nullif(btrim(name), '') INTO v_sender_name FROM public.profiles WHERE id = v_sender_id;
  INSERT INTO public.notifications(user_id, kind, text, link)
  VALUES(p_recipient_id, 'message', coalesce(v_sender_name, 'Someone') || ' sent you an introduction.', '#/messages');
  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_opportunity_application(uuid, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_opportunity_application(uuid, text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.create_direct_conversation(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, text, text) TO authenticated;

