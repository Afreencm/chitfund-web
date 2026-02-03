-- 1. Drop existing broad select policy
DROP POLICY IF EXISTS "Users can view chit groups in their tenant" ON public.chit_groups;

-- 2. Admin Policy: View all chit groups in their tenant
-- Admins and Super Admins have full visibility of all groups within their tenant boundary.
CREATE POLICY "Admins can view all chit groups in their tenant"
ON public.chit_groups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE public.users.id = auth.uid()
    AND public.users.tenant_id = public.chit_groups.tenant_id
    AND public.users.role IN ('admin', 'super_admin')
  )
);

-- 3. Member Policy: View ONLY assigned chit groups
-- Regular users can only see groups where they have an explicit entry in the chit_members table.
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
