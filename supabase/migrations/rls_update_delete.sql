-- UPDATE POLICY
CREATE POLICY "Admins can update chit groups within their tenant"
ON public.chit_groups
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.tenant_id = public.chit_groups.tenant_id
    AND public.users.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.tenant_id = public.chit_groups.tenant_id
    AND public.users.role IN ('admin', 'super_admin')
  )
);

-- DELETE POLICY
CREATE POLICY "Admins can delete chit groups within their tenant"
ON public.chit_groups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.tenant_id = public.chit_groups.tenant_id
    AND public.users.role IN ('admin', 'super_admin')
  )
);
