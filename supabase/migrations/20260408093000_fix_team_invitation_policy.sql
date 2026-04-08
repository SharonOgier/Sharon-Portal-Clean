DROP POLICY IF EXISTS "Invitees can view their invitations" ON public.sas_team_invitations;

CREATE POLICY "Invitees can view their invitations"
ON public.sas_team_invitations
FOR SELECT
USING (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);
