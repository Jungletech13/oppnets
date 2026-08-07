-- Prevent recursive RLS evaluation when authenticated users read space_members.
-- The function is owned by the migration role and runs with row security bypassed,
-- while exposing only a boolean membership check to authenticated users.
CREATE OR REPLACE FUNCTION public.is_space_member(p_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.space_members AS sm
    WHERE sm.space_id = p_space_id
      AND sm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_space_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_space_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "select_space_members" ON public.space_members;
CREATE POLICY "select_space_members"
ON public.space_members
FOR SELECT
TO authenticated
USING (public.is_space_member(space_id));

