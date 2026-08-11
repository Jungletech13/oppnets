/*
  Close legacy RPC exposure without changing the functions used by authenticated
  RLS policies. Trigger functions remain available to their database triggers,
  but cannot be invoked directly through the API.
*/

ALTER FUNCTION public.update_updated_at()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_subscription_plans_updated_at()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_user_subscriptions_updated_at()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_3b()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin()
  SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.update_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_subscription_plans_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_subscriptions_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_3b() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_space_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid) TO authenticated;
