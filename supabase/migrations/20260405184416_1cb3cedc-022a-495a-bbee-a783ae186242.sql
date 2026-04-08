
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'member');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create team_members table
CREATE TABLE public.sas_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  member_user_id uuid NOT NULL,
  permission text NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (owner_user_id, member_user_id)
);
ALTER TABLE public.sas_team_members ENABLE ROW LEVEL SECURITY;

-- 4. Create team_invitations table
CREATE TABLE public.sas_team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_user_id uuid NOT NULL,
  email text NOT NULL,
  permission text NOT NULL DEFAULT 'viewer' CHECK (permission IN ('viewer', 'editor')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone
);
ALTER TABLE public.sas_team_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Security definer function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. Security definer function: get accessible user_ids for a user
CREATE OR REPLACE FUNCTION public.get_accessible_user_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Own data
  SELECT _user_id
  UNION
  -- If admin, get all user_ids from sas_profile
  SELECT sp.user_id FROM public.sas_profile sp
  WHERE public.has_role(_user_id, 'admin')
  UNION
  -- If team member, get owner's user_id
  SELECT tm.owner_user_id FROM public.sas_team_members tm
  WHERE tm.member_user_id = _user_id
$$;

-- 7. RLS policies for user_roles
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 8. RLS policies for team_members
CREATE POLICY "Owners manage own team"
ON public.sas_team_members FOR ALL
USING (auth.uid() = owner_user_id OR auth.uid() = member_user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = owner_user_id OR public.has_role(auth.uid(), 'admin'));

-- 9. RLS policies for team_invitations
CREATE POLICY "Users manage own invitations"
ON public.sas_team_invitations FOR ALL
USING (auth.uid() = inviter_user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = inviter_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Invitees can view their invitations"
ON public.sas_team_invitations FOR SELECT
USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));
