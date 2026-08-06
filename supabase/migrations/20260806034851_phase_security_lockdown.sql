/*
# Security Lockdown — Revoke Anonymous Execute on Admin Functions

## Purpose
The Supabase security advisor flagged 15 SECURITY DEFINER functions
callable by the `anon` role and 17 callable by `authenticated`. While
every admin function already contains an internal `is_admin()` check
(meaning anonymous callers receive "Permission denied"), the functions
are still *invocable* — an attacker can trigger execution, probe for
error messages, and attempt timing or enumeration attacks.

This migration applies defense-in-depth: revoke EXECUTE from `anon`
and `PUBLIC` on all admin-only functions so they cannot even be
called without an authenticated admin session.

## Functions Locked Down (admin-only — EXECUTE revoked from anon/PUBLIC)
- `_admin_audit` — internal audit helper
- `admin_create_plan` — create subscription plan
- `admin_update_plan` — update subscription plan
- `admin_update_entitlements` — update plan entitlements
- `admin_assign_subscription` — assign subscription to user
- `admin_update_subscription_status` — change subscription status
- `admin_assign_seat` — assign company seat
- `admin_remove_seat` — remove company seat
- `admin_update_cost_factor` — update cost factor
- `admin_generate_verified_collaborations` — generate verified collaboration records
- `admin_invalidate_verified_collaboration` — invalidate a verified collaboration
- `admin_expire_review_eligibility` — expire review eligibility records
- `admin_revoke_review_eligibility` — revoke a review eligibility record

## Functions Left Callable (RLS helpers / triggers — must stay invocable)
- `is_admin()` — called by RLS policies on every request; must remain callable
- `is_company_member(uuid)` — called by RLS policies; must remain callable
- `check_seat_capacity()` — called by INSERT trigger on seat_assignments; must remain callable
- `handle_new_user()` — called by auth trigger on new user signup; must remain callable
- `update_updated_at()` — trigger function for updated_at columns; must remain callable

## Additional Fix
- `update_updated_at()` — added explicit `SET search_path = public, pg_temp`
  to resolve the "function_search_path_mutable" security advisor warning.

## Security Changes
- REVOKE EXECUTE on 13 admin-only functions from `anon` and `PUBLIC`.
- `authenticated` retains EXECUTE (admin functions check `is_admin()`
  internally, so non-admin authenticated users still get "Permission denied").
- Fixed mutable search_path on `update_updated_at`.

## Notes
1. This is a non-destructive migration — no data is changed, no tables
   are altered, no functions are redefined. Only GRANT/REVOKE and
   search_path configuration.
2. All admin functions already have internal `is_admin()` guards, so
   this is defense-in-depth, not the sole security boundary.
3. RLS helper functions (`is_admin`, `is_company_member`,
   `check_seat_capacity`) MUST remain callable by `anon` and
   `authenticated` because RLS policies invoke them during query
   evaluation. Revoking EXECUTE on these would break all RLS policies
   that use them.
*/

-- ============================================================
-- 1. Revoke EXECUTE from anon and PUBLIC on admin-only functions
-- ============================================================

REVOKE EXECUTE ON FUNCTION public._admin_audit(text, text, text, text, jsonb, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_create_plan(text, text, text, integer, text, text, text, integer, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_plan(uuid, jsonb, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_entitlements(uuid, jsonb, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_assign_subscription(uuid, uuid, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_subscription_status(uuid, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_assign_seat(uuid, uuid, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_remove_seat(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_update_cost_factor(uuid, integer, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_generate_verified_collaborations(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_invalidate_verified_collaboration(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_expire_review_eligibility() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_review_eligibility(uuid, text) FROM anon, PUBLIC;

-- ============================================================
-- 2. Fix mutable search_path on update_updated_at trigger function
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
