-- CREATE TABLE: chit_members
CREATE TABLE IF NOT EXISTS public.chit_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    chit_group_id UUID NOT NULL REFERENCES public.chit_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: A user can join a chit group only ONCE
    UNIQUE (chit_group_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chit_members ENABLE ROW LEVEL SECURITY;
