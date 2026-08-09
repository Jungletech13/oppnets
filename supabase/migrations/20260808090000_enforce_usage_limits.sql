-- Launch-plan limits for the production key/value entitlement schema.
WITH limits(plan_tier, key, value, label, category, sort_order) AS (
  VALUES
    ('builder-free', 'max_opportunities', '1', 'Active opportunities', 'limits', 10),
    ('builder-free', 'max_applications', '10', 'Applications per month', 'limits', 20),
    ('builder-free', 'max_saved_opportunities', '10', 'Saved opportunities', 'limits', 30),
    ('builder-free', 'max_collaboration_spaces', '1', 'Collaboration spaces', 'limits', 40),
    ('builder-free', 'max_team_members', '3', 'Team members per space', 'limits', 50),
    ('builder-free', 'max_messages_per_day', '20', 'Messages per day', 'limits', 60),
    ('builder-free', 'max_file_storage_mb', '100', 'File storage (MB)', 'limits', 70),
    ('builder-free', 'can_use_ai', 'false', 'AI assistance', 'features', 80),
    ('builder-free', 'max_ai_actions_per_month', '0', 'AI actions per month', 'limits', 90),
    ('builder-pro', 'max_opportunities', '5', 'Active opportunities', 'limits', 10),
    ('builder-pro', 'max_applications', '50', 'Applications per month', 'limits', 20),
    ('builder-pro', 'max_saved_opportunities', '50', 'Saved opportunities', 'limits', 30),
    ('builder-pro', 'max_collaboration_spaces', '5', 'Collaboration spaces', 'limits', 40),
    ('builder-pro', 'max_team_members', '5', 'Team members per space', 'limits', 50),
    ('builder-pro', 'max_messages_per_day', '100', 'Messages per day', 'limits', 60),
    ('builder-pro', 'max_file_storage_mb', '1024', 'File storage (MB)', 'limits', 70),
    ('builder-pro', 'can_use_ai', 'true', 'AI assistance', 'features', 80),
    ('builder-pro', 'max_ai_actions_per_month', '50', 'AI actions per month', 'limits', 90),
    ('professional', 'max_opportunities', '15', 'Active opportunities', 'limits', 10),
    ('professional', 'max_applications', '100', 'Applications per month', 'limits', 20),
    ('professional', 'max_saved_opportunities', '100', 'Saved opportunities', 'limits', 30),
    ('professional', 'max_collaboration_spaces', '15', 'Collaboration spaces', 'limits', 40),
    ('professional', 'max_team_members', '10', 'Team members per space', 'limits', 50),
    ('professional', 'max_messages_per_day', '300', 'Messages per day', 'limits', 60),
    ('professional', 'max_file_storage_mb', '5120', 'File storage (MB)', 'limits', 70),
    ('professional', 'can_use_ai', 'true', 'AI assistance', 'features', 80),
    ('professional', 'max_ai_actions_per_month', '250', 'AI actions per month', 'limits', 90),
    ('company', 'max_opportunities', '50', 'Active opportunities', 'limits', 10),
    ('company', 'max_applications', '250', 'Applications per month', 'limits', 20),
    ('company', 'max_saved_opportunities', '250', 'Saved opportunities', 'limits', 30),
    ('company', 'max_collaboration_spaces', '50', 'Collaboration spaces', 'limits', 40),
    ('company', 'max_team_members', '10', 'Team members per space', 'limits', 50),
    ('company', 'max_messages_per_day', '1000', 'Messages per day', 'limits', 60),
    ('company', 'max_file_storage_mb', '25600', 'File storage (MB)', 'limits', 70),
    ('company', 'can_use_ai', 'true', 'AI assistance', 'features', 80),
    ('company', 'max_ai_actions_per_month', '750', 'AI actions per month', 'limits', 90)
)
INSERT INTO public.plan_entitlements(plan_tier, key, value, label, category, sort_order)
SELECT plan_tier, key, value, label, category, sort_order FROM limits
ON CONFLICT(plan_tier, key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS public.usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_key text NOT NULL,
  period_start date NOT NULL,
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, metric_key, period_start)
);

ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_counters_select_own ON public.usage_counters;
CREATE POLICY usage_counters_select_own ON public.usage_counters
  FOR SELECT TO authenticated USING (user_id = auth.uid());
REVOKE ALL ON public.usage_counters FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.usage_counters TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_entitlements(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_tier text;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  SELECT us.plan_tier INTO v_tier
  FROM public.user_subscriptions us
  WHERE us.user_id = p_user_id AND us.status IN ('free', 'trial', 'active', 'past_due')
  ORDER BY CASE us.status WHEN 'active' THEN 1 WHEN 'trial' THEN 2 WHEN 'past_due' THEN 3 ELSE 4 END,
           us.updated_at DESC
  LIMIT 1;
  v_tier := COALESCE(v_tier, 'builder-free');

  SELECT COALESCE(jsonb_object_agg(
    pe.key,
    CASE
      WHEN lower(pe.value) IN ('true', 'false') THEN to_jsonb(pe.value::boolean)
      WHEN pe.value ~ '^-?[0-9]+$' THEN to_jsonb(pe.value::integer)
      ELSE to_jsonb(pe.value)
    END
  ), '{}'::jsonb) || jsonb_build_object('plan_tier', v_tier)
  INTO v_result
  FROM public.plan_entitlements pe
  WHERE pe.plan_tier = v_tier;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_usage(p_metric_key text, p_amount integer DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_start date := date_trunc('month', now())::date;
  v_reset timestamptz := date_trunc('month', now()) + interval '1 month';
  v_limit integer;
  v_used integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_amount IS NULL OR p_amount < 1 THEN RAISE EXCEPTION 'Usage amount must be positive'; END IF;
  IF p_metric_key <> 'ai_actions' THEN RAISE EXCEPTION 'Unsupported usage metric: %', p_metric_key; END IF;

  v_limit := COALESCE((public.current_user_entitlements(v_user)->>'max_ai_actions_per_month')::integer, 0);
  IF v_limit = 0 OR p_amount > v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'metric', p_metric_key, 'current', 0,
      'limit', v_limit, 'remaining', v_limit, 'reset_at', v_reset);
  END IF;

  INSERT INTO public.usage_counters(user_id, metric_key, period_start, usage_count)
  VALUES(v_user, p_metric_key, v_start, p_amount)
  ON CONFLICT(user_id, metric_key, period_start) DO UPDATE SET
    usage_count = usage_counters.usage_count + EXCLUDED.usage_count,
    updated_at = now()
  WHERE usage_counters.usage_count + EXCLUDED.usage_count <= v_limit
  RETURNING usage_count INTO v_used;

  IF NOT FOUND THEN
    SELECT COALESCE(usage_count, 0) INTO v_used FROM public.usage_counters
    WHERE user_id = v_user AND metric_key = p_metric_key AND period_start = v_start;
    RETURN jsonb_build_object('allowed', false, 'metric', p_metric_key, 'current', COALESCE(v_used, 0),
      'limit', v_limit, 'remaining', GREATEST(v_limit - COALESCE(v_used, 0), 0), 'reset_at', v_reset);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'metric', p_metric_key, 'current', v_used,
    'limit', v_limit, 'remaining', GREATEST(v_limit - v_used, 0), 'reset_at', v_reset);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_usage_limits()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_ent jsonb;
  v_ai integer := 0;
  v_opps integer := 0;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  v_ent := public.current_user_entitlements(v_user);
  SELECT COALESCE(usage_count, 0) INTO v_ai FROM public.usage_counters
    WHERE user_id = v_user AND metric_key = 'ai_actions' AND period_start = date_trunc('month', now())::date;
  SELECT count(*) INTO v_opps FROM public.opportunities WHERE owner_id = v_user;

  RETURN jsonb_build_object(
    'plan_tier', v_ent->>'plan_tier',
    'active_opportunities', jsonb_build_object('used', v_opps, 'limit', (v_ent->>'max_opportunities')::integer),
    'ai_actions', jsonb_build_object('used', v_ai, 'limit', (v_ent->>'max_ai_actions_per_month')::integer,
      'remaining', GREATEST((v_ent->>'max_ai_actions_per_month')::integer - v_ai, 0),
      'reset_at', date_trunc('month', now()) + interval '1 month'),
    'collaboration_spaces', jsonb_build_object('limit', (v_ent->>'max_collaboration_spaces')::integer),
    'team_members', jsonb_build_object('limit', (v_ent->>'max_team_members')::integer),
    'messages_per_day', jsonb_build_object('limit', (v_ent->>'max_messages_per_day')::integer),
    'storage_mb', jsonb_build_object('limit', (v_ent->>'max_file_storage_mb')::integer)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_opportunity_limit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_limit integer;
  v_used integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.owner_id <> auth.uid() THEN RAISE EXCEPTION 'Cannot create an opportunity for another user'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.owner_id = NEW.owner_id THEN RETURN NEW; END IF;

  v_limit := COALESCE((public.current_user_entitlements(NEW.owner_id)->>'max_opportunities')::integer, 0);
  SELECT count(*) INTO v_used FROM public.opportunities
  WHERE owner_id = NEW.owner_id AND (TG_OP = 'INSERT' OR id <> NEW.id);
  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Opportunity limit reached (%). Archive one or upgrade your plan.', v_limit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_opportunity_limit_trigger ON public.opportunities;
CREATE TRIGGER enforce_opportunity_limit_trigger
  BEFORE INSERT OR UPDATE OF owner_id ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.enforce_opportunity_limit();

REVOKE ALL ON FUNCTION public.current_user_entitlements(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.consume_usage(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_usage_limits() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.enforce_opportunity_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_entitlements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_usage(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_usage_limits() TO authenticated;

