-- INSERT POLICY: Admins can add members
CREATE POLICY "Admins can add members within their tenant"
ON public.chit_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.tenant_id = public.chit_members.tenant_id
    AND public.users.role IN ('admin', 'super_admin')
  )
);

-- SELECT POLICY: Admins see all, members see their own
CREATE POLICY "Users can view memberships within their tenant"
ON public.chit_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.tenant_id = public.chit_members.tenant_id
    AND (
      public.users.role IN ('admin', 'super_admin')
      OR
      public.chit_members.user_id = auth.uid()
    )
  )
);
