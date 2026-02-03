-- Enable RLS
ALTER TABLE public.chit_contributions ENABLE ROW LEVEL SECURITY;

-- DROP existing policies if any
DROP POLICY IF EXISTS "Admins can view all contributions for their tenant" ON public.chit_contributions;
DROP POLICY IF EXISTS "Users can view their own contributions" ON public.chit_contributions;
DROP POLICY IF EXISTS "Admins can insert contributions for their tenant" ON public.chit_contributions;
DROP POLICY IF EXISTS "Admins can update contributions for their tenant" ON public.chit_contributions;
DROP POLICY IF EXISTS "Admins can delete contributions for their tenant" ON public.chit_contributions;

-- 1. SELECT: Admins can view all contributions within their tenant
CREATE POLICY "Admins can view all contributions for their tenant"
ON public.chit_contributions
FOR SELECT
USING (
  public.get_auth_user_role() IN ('admin', 'super_admin')
  AND tenant_id = public.get_auth_user_tenant()
);

-- 2. SELECT: Members can view ONLY their own contributions
CREATE POLICY "Users can view their own contributions"
ON public.chit_contributions
FOR SELECT
USING (
  user_id = auth.uid()
);

-- 3. INSERT: Admins can add contributions within their tenant
CREATE POLICY "Admins can insert contributions for their tenant"
ON public.chit_contributions
FOR INSERT
WITH CHECK (
  public.get_auth_user_role() IN ('admin', 'super_admin')
  AND tenant_id = public.get_auth_user_tenant()
);

-- 4. UPDATE: Admins can update contributions within their tenant
CREATE POLICY "Admins can update contributions for their tenant"
ON public.chit_contributions
FOR UPDATE
USING (
  public.get_auth_user_role() IN ('admin', 'super_admin')
  AND tenant_id = public.get_auth_user_tenant()
)
WITH CHECK (
  public.get_auth_user_role() IN ('admin', 'super_admin')
  AND tenant_id = public.get_auth_user_tenant()
);

-- 5. DELETE: Admins can delete contributions within their tenant
CREATE POLICY "Admins can delete contributions for their tenant"
ON public.chit_contributions
FOR DELETE
USING (
  public.get_auth_user_role() IN ('admin', 'super_admin')
  AND tenant_id = public.get_auth_user_tenant()
);
