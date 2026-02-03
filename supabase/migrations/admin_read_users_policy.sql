-- SELECT POLICY: Admins can read all users in their tenant
-- This allows admins to fetch the list of users when adding members to a chit group.
CREATE POLICY "Admins can view all users in their tenant"
ON public.users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users AS admin_u
    WHERE admin_u.id = auth.uid()
    AND admin_u.tenant_id = public.users.tenant_id
    AND admin_u.role IN ('admin', 'super_admin')
  )
);
