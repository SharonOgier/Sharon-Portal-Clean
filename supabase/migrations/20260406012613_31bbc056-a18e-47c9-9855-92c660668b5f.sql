
CREATE OR REPLACE FUNCTION public.get_accessible_user_ids(_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  UNION
  -- If subcontractor, get job owner's user_id for assigned jobs
  SELECT sa.job_owner_user_id FROM public.sas_subcontractor_assignments sa
  WHERE sa.subcontractor_user_id = _user_id AND sa.status = 'active'
$function$;
