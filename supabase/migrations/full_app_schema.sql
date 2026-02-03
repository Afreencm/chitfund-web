-- ==========================================
-- CHIT FUND FULL SCHEMA (MULTI-TENANT)
-- ==========================================

-- 1. CLEANUP (Ensures clean slate by dropping dependent objects)
DROP VIEW IF EXISTS public.v_chit_group_members CASCADE;
DROP VIEW IF EXISTS public.v_users_basic CASCADE;
DROP TABLE IF EXISTS public.chit_contributions CASCADE;
DROP TABLE IF EXISTS public.chit_members CASCADE;
DROP TABLE IF EXISTS public.chit_groups CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- 2. ENUMS & EXTENSIONS
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'member');

-- 3. TABLES
-- Tenants
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (Profile)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role public.user_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chit Groups
CREATE TABLE public.chit_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
    installments INTEGER NOT NULL CHECK (installments > 0),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chit Members
CREATE TABLE public.chit_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    chit_group_id UUID NOT NULL REFERENCES public.chit_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (chit_group_id, user_id)
);

-- Chit Contributions
CREATE TABLE public.chit_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    chit_group_id UUID NOT NULL REFERENCES public.chit_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    installment_no INTEGER NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL CHECK (status IN ('paid', 'unpaid')),
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (tenant_id, chit_group_id, user_id, installment_no)
);

-- 4. SECURITY DEFINER FUNCTIONS (Recursion safe)
CREATE OR REPLACE FUNCTION public.get_auth_user_role() RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, auth;

CREATE OR REPLACE FUNCTION public.get_auth_user_tenant() RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, auth;

-- 5. ROW LEVEL SECURITY
-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chit_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chit_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chit_contributions ENABLE ROW LEVEL SECURITY;

-- Tenants: Allow public registration and visibility of names
-- (Required for account creation flow)
CREATE POLICY "Tenants public visibility" ON public.tenants 
FOR SELECT USING (true);

CREATE POLICY "Tenants registration" ON public.tenants
FOR INSERT WITH CHECK (true);

-- Users: Self + Admins in same tenant; Enable self-creation during registration
-- (Note: id FK check to auth.users ensures internal data integrity)
CREATE POLICY "Users access" ON public.users 
FOR SELECT USING (
  id = auth.uid() 
  OR (tenant_id = public.get_auth_user_tenant() AND public.get_auth_user_role() != 'member')
);

CREATE POLICY "Users self-creation" ON public.users
FOR INSERT WITH CHECK (true);

-- Chit Groups
CREATE POLICY "Groups read" ON public.chit_groups FOR SELECT 
USING (tenant_id = public.get_auth_user_tenant());

CREATE POLICY "Groups manage" ON public.chit_groups FOR ALL 
USING (tenant_id = public.get_auth_user_tenant() AND public.get_auth_user_role() != 'member')
WITH CHECK (tenant_id = public.get_auth_user_tenant() AND public.get_auth_user_role() != 'member');

-- Chit Members
CREATE POLICY "Members read" ON public.chit_members FOR SELECT 
USING (user_id = auth.uid() OR (tenant_id = public.get_auth_user_tenant() AND public.get_auth_user_role() != 'member'));

CREATE POLICY "Members manage" ON public.chit_members FOR ALL 
USING (tenant_id = public.get_auth_user_tenant() AND public.get_auth_user_role() != 'member')
WITH CHECK (tenant_id = public.get_auth_user_tenant() AND public.get_auth_user_role() != 'member');

-- Chit Contributions
CREATE POLICY "Contributions read" ON public.chit_contributions FOR SELECT 
USING (user_id = auth.uid() OR (tenant_id = public.get_auth_user_tenant() AND public.get_auth_user_role() != 'member'));

CREATE POLICY "Contributions manage" ON public.chit_contributions FOR ALL 
USING (tenant_id = public.get_auth_user_tenant() AND public.get_auth_user_role() != 'member')
WITH CHECK (tenant_id = public.get_auth_user_tenant() AND public.get_auth_user_role() != 'member');

-- 6. VIEWS (Safe access)
CREATE OR REPLACE VIEW public.v_users_basic AS
SELECT id, email, tenant_id FROM public.users
WHERE tenant_id = public.get_auth_user_tenant();

CREATE OR REPLACE VIEW public.v_chit_group_members AS
SELECT 
    m.chit_group_id,
    m.user_id,
    u.email,
    m.tenant_id
FROM public.chit_members m
JOIN public.users u ON m.user_id = u.id
WHERE m.tenant_id = public.get_auth_user_tenant();
