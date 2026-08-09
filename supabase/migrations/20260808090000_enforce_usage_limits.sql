-- Launch-plan limits and cost-sensitive AI metering.
ALTER TABLE public.plan_entitlements ADD COLUMN IF NOT EXISTS max_ai_actions_per_month integer NOT NULL DEFAULT 0;
ALTER TABLE public.plan_entitlements DROP CONSTRAINT IF EXISTS plan_entitlements_max_ai_actions_per_month_check;
ALTER TABLE public.plan_entitlements ADD CONSTRAINT plan_entitlements_max_ai_actions_per_month_check CHECK (max_ai_actions_per_month >= 0);

UPDATE public.plan_entitlements pe SET
  max_opportunities=l.max_opportunities, max_applications=l.max_applications,
  max_saved_items=l.max_saved_items, max_collaboration_spaces=l.max_collaboration_spaces,
  max_team_members=l.max_team_members, max_messages_per_day=l.max_messages_per_day,
  storage_limit_mb=l.storage_limit_mb, max_professional_listings=l.max_professional_listings,
  max_company_pages=l.max_company_pages, max_ai_actions_per_month=l.max_ai_actions_per_month,
  ai_access=l.ai_access
FROM public.subscription_plans sp
JOIN (VALUES
 ('builder-free',1,10,10,1,3,20,100,0,0,0,false),
 ('builder-pro',5,50,50,5,5,100,1024,0,0,50,true),
 ('professional',15,100,100,15,10,300,5120,1,0,250,true),
 ('company',50,250,250,50,10,1000,25600,5,1,750,true)
) l(slug,max_opportunities,max_applications,max_saved_items,max_collaboration_spaces,max_team_members,max_messages_per_day,storage_limit_mb,max_professional_listings,max_company_pages,max_ai_actions_per_month,ai_access)
ON l.slug=sp.slug WHERE pe.plan_id=sp.id;

CREATE TABLE IF NOT EXISTS public.usage_counters (
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 metric_key text NOT NULL, period_start date NOT NULL,
 used_quantity integer NOT NULL DEFAULT 0 CHECK (used_quantity >= 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,metric_key,period_start)
);
ALTER TABLE public.usage_counters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS usage_counters_select_own ON public.usage_counters;
CREATE POLICY usage_counters_select_own ON public.usage_counters FOR SELECT TO authenticated USING(user_id=auth.uid());
REVOKE ALL ON public.usage_counters FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.usage_counters TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_entitlements(p_user_id uuid)
RETURNS public.plan_entitlements LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_ent public.plan_entitlements;
BEGIN
 SELECT pe.* INTO v_ent FROM public.user_subscriptions us JOIN public.plan_entitlements pe ON pe.plan_id=us.plan_id
 WHERE us.user_id=p_user_id AND us.status IN ('free','trial','active','past_due')
 ORDER BY CASE us.status WHEN 'active' THEN 1 WHEN 'trial' THEN 2 WHEN 'past_due' THEN 3 ELSE 4 END,us.updated_at DESC LIMIT 1;
 IF NOT FOUND THEN SELECT pe.* INTO v_ent FROM public.plan_entitlements pe JOIN public.subscription_plans sp ON sp.id=pe.plan_id WHERE sp.slug='builder-free' LIMIT 1; END IF;
 RETURN v_ent;
END $$;

CREATE OR REPLACE FUNCTION public.consume_usage(p_metric_key text,p_amount integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_user uuid:=auth.uid(); v_start date:=date_trunc('month',now())::date; v_reset timestamptz:=date_trunc('month',now())+interval '1 month'; v_limit integer; v_used integer;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_amount IS NULL OR p_amount<1 THEN RAISE EXCEPTION 'Usage amount must be positive'; END IF;
 IF p_metric_key<>'ai_actions' THEN RAISE EXCEPTION 'Unsupported usage metric: %',p_metric_key; END IF;
 SELECT max_ai_actions_per_month INTO v_limit FROM public.current_user_entitlements(v_user); v_limit:=COALESCE(v_limit,0);
 IF v_limit=0 OR p_amount>v_limit THEN RETURN jsonb_build_object('allowed',false,'metric',p_metric_key,'current',0,'limit',v_limit,'remaining',v_limit,'reset_at',v_reset); END IF;
 INSERT INTO public.usage_counters(user_id,metric_key,period_start,used_quantity) VALUES(v_user,p_metric_key,v_start,p_amount)
 ON CONFLICT(user_id,metric_key,period_start) DO UPDATE SET used_quantity=usage_counters.used_quantity+EXCLUDED.used_quantity,updated_at=now()
 WHERE usage_counters.used_quantity+EXCLUDED.used_quantity<=v_limit RETURNING used_quantity INTO v_used;
 IF NOT FOUND THEN SELECT COALESCE(used_quantity,0) INTO v_used FROM public.usage_counters WHERE user_id=v_user AND metric_key=p_metric_key AND period_start=v_start;
  v_used:=COALESCE(v_used,0); RETURN jsonb_build_object('allowed',false,'metric',p_metric_key,'current',v_used,'limit',v_limit,'remaining',GREATEST(v_limit-v_used,0),'reset_at',v_reset); END IF;
 RETURN jsonb_build_object('allowed',true,'metric',p_metric_key,'current',v_used,'limit',v_limit,'remaining',GREATEST(v_limit-v_used,0),'reset_at',v_reset);
END $$;

CREATE OR REPLACE FUNCTION public.get_my_usage_limits() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_user uuid:=auth.uid(); v_ent public.plan_entitlements; v_slug text; v_ai integer:=0; v_opps integer:=0;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF; v_ent:=public.current_user_entitlements(v_user);
 SELECT sp.slug INTO v_slug FROM public.user_subscriptions us JOIN public.subscription_plans sp ON sp.id=us.plan_id WHERE us.user_id=v_user AND us.status IN ('free','trial','active','past_due') ORDER BY CASE us.status WHEN 'active' THEN 1 WHEN 'trial' THEN 2 WHEN 'past_due' THEN 3 ELSE 4 END,us.updated_at DESC LIMIT 1;
 SELECT COALESCE(used_quantity,0) INTO v_ai FROM public.usage_counters WHERE user_id=v_user AND metric_key='ai_actions' AND period_start=date_trunc('month',now())::date;
 SELECT count(*) INTO v_opps FROM public.opportunities WHERE owner_id=v_user AND stage NOT IN ('Completed','Archived');
 RETURN jsonb_build_object('plan_slug',COALESCE(v_slug,'builder-free'),'active_opportunities',jsonb_build_object('used',v_opps,'limit',v_ent.max_opportunities),'ai_actions',jsonb_build_object('used',v_ai,'limit',v_ent.max_ai_actions_per_month,'remaining',GREATEST(v_ent.max_ai_actions_per_month-v_ai,0),'reset_at',date_trunc('month',now())+interval '1 month'),'collaboration_spaces',jsonb_build_object('limit',v_ent.max_collaboration_spaces),'team_members',jsonb_build_object('limit',v_ent.max_team_members),'messages_per_day',jsonb_build_object('limit',v_ent.max_messages_per_day),'storage_mb',jsonb_build_object('limit',v_ent.storage_limit_mb));
END $$;

CREATE OR REPLACE FUNCTION public.enforce_opportunity_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_limit integer; v_used integer;
BEGIN
 IF auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF NEW.owner_id<>auth.uid() THEN RAISE EXCEPTION 'Cannot create an opportunity for another user'; END IF;
 IF NEW.stage IN ('Completed','Archived') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND OLD.owner_id=NEW.owner_id AND OLD.stage NOT IN ('Completed','Archived') THEN RETURN NEW; END IF;
 SELECT max_opportunities INTO v_limit FROM public.current_user_entitlements(NEW.owner_id);
 SELECT count(*) INTO v_used FROM public.opportunities WHERE owner_id=NEW.owner_id AND stage NOT IN ('Completed','Archived') AND (TG_OP='INSERT' OR id<>NEW.id);
 IF v_used>=COALESCE(v_limit,0) THEN RAISE EXCEPTION 'Active opportunity limit reached (%). Archive or complete one, or upgrade your plan.',COALESCE(v_limit,0); END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enforce_opportunity_limit_trigger ON public.opportunities;
CREATE TRIGGER enforce_opportunity_limit_trigger BEFORE INSERT OR UPDATE OF owner_id,stage ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.enforce_opportunity_limit();

-- Keep the admin entitlement editor in sync with the metered AI allowance.
CREATE OR REPLACE FUNCTION public.admin_update_entitlements(
  p_entitlement_id uuid,
  p_updates jsonb,
  p_reason text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_prev public.plan_entitlements;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied: admin role required';
  END IF;

  SELECT * INTO v_prev FROM public.plan_entitlements WHERE id = p_entitlement_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Entitlements not found: %', p_entitlement_id;
  END IF;

  UPDATE public.plan_entitlements SET
    max_opportunities = COALESCE((p_updates->>'max_opportunities')::integer, max_opportunities),
    max_applications = COALESCE((p_updates->>'max_applications')::integer, max_applications),
    max_saved_items = COALESCE((p_updates->>'max_saved_items')::integer, max_saved_items),
    max_collaboration_spaces = COALESCE((p_updates->>'max_collaboration_spaces')::integer, max_collaboration_spaces),
    max_team_members = COALESCE((p_updates->>'max_team_members')::integer, max_team_members),
    max_messages_per_day = COALESCE((p_updates->>'max_messages_per_day')::integer, max_messages_per_day),
    storage_limit_mb = COALESCE((p_updates->>'storage_limit_mb')::integer, storage_limit_mb),
    max_professional_listings = COALESCE((p_updates->>'max_professional_listings')::integer, max_professional_listings),
    max_company_pages = COALESCE((p_updates->>'max_company_pages')::integer, max_company_pages),
    max_ai_actions_per_month = COALESCE((p_updates->>'max_ai_actions_per_month')::integer, max_ai_actions_per_month),
    ai_access = COALESCE((p_updates->>'ai_access')::boolean, ai_access),
    advanced_search = COALESCE((p_updates->>'advanced_search')::boolean, advanced_search),
    analytics_access = COALESCE((p_updates->>'analytics_access')::boolean, analytics_access),
    priority_visibility = COALESCE((p_updates->>'priority_visibility')::boolean, priority_visibility),
    sponsored_listing_access = COALESCE((p_updates->>'sponsored_listing_access')::boolean, sponsored_listing_access),
    recruiting_tools = COALESCE((p_updates->>'recruiting_tools')::boolean, recruiting_tools),
    marketing_tools = COALESCE((p_updates->>'marketing_tools')::boolean, marketing_tools),
    public_builder_profile = COALESCE((p_updates->>'public_builder_profile')::boolean, public_builder_profile),
    seo_profile = COALESCE((p_updates->>'seo_profile')::boolean, seo_profile),
    updated_at = now()
  WHERE id = p_entitlement_id;

  PERFORM public._admin_audit('entitlement.update', 'plan_entitlements', p_entitlement_id::text, p_reason, to_jsonb(v_prev), p_updates);
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_entitlements(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.consume_usage(text,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.get_my_usage_limits() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.consume_usage(text,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_usage_limits() TO authenticated;
