-- Ensure RLS is enabled on chit_groups
ALTER TABLE public.chit_groups ENABLE ROW LEVEL SECURITY;

-- SELECT POLICY: Users can view chit groups in their tenant
-- This is required to load the "Chit Groups" table in the UI.
CREATE POLICY "Users can view chit groups in their tenant"
ON public.chit_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.tenant_id = public.chit_groups.tenant_id
  )
);
