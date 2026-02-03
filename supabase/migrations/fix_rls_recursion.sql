-- 1. SECURITY DEFINER functions to break recursion
-- These functions run with the privileges of the creator (postgres) 
-- and thus bypass RLS on the tables they query.
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_user_tenant()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop problematic policies to start clean
DROP POLICY IF EXISTS "Admins can view all users in their tenant" ON public.users;
DROP POLICY IF EXISTS "Admins can view all chit groups in their tenant" ON public.chit_groups;
DROP POLICY IF EXISTS "Members can view their assigned chit groups" ON public.chit_groups;
DROP POLICY IF EXISTS "Users can view chit groups in their tenant" ON public.chit_groups;

-- 3. Re-implement users policies safely
-- Users can always see their own profile (non-recursive)
CREATE POLICY "Users can always view their own profile"
ON public.users
FOR SELECT
USING (id = auth.uid());

-- Admins can view all users in their tenant (using safe functions)
CREATE POLICY "Admins can view all users in their tenant"
ON public.users
FOR SELECT
USING (
  public.get_auth_user_role() IN ('admin', 'super_admin')
  AND tenant_id = public.get_auth_user_tenant()
);

-- 4. Re-implement chit_groups policies safely
-- Admins can view all chit groups in their tenant
CREATE POLICY "Admins can view all chit groups in their tenant"
ON public.chit_groups
FOR SELECT
USING (
  public.get_auth_user_role() IN ('admin', 'super_admin')
  AND tenant_id = public.get_auth_user_tenant()
);

-- Members can view ONLY assigned chit groups
CREATE POLICY "Members can view their assigned chit groups"
ON public.chit_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.chit_members
    WHERE public.chit_members.user_id = auth.uid()
    AND public.chit_members.chit_group_id = public.chit_groups.id
  )
);

-- 5. Re-implement chit_members policies safely
DROP POLICY IF EXISTS "Admins can add members within their tenant" ON public.chit_members;
DROP POLICY IF EXISTS "Users can view memberships within their tenant" ON public.chit_members;

CREATE POLICY "Admins can add members within their tenant"
ON public.chit_members
FOR INSERT
WITH CHECK (
  public.get_auth_user_role() IN ('admin', 'super_admin')
  AND tenant_id = public.get_auth_user_tenant()
);

CREATE POLICY "Users can view memberships within their tenant"
ON public.chit_members
FOR SELECT
USING (
  public.get_auth_user_role() IN ('admin', 'super_admin')
  OR
  user_id = auth.uid()
);
