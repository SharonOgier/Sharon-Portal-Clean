-- Create sas_jobs table following existing JSONB pattern
CREATE TABLE public.sas_jobs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.sas_jobs ENABLE ROW LEVEL SECURITY;

-- RLS policy using existing get_accessible_user_ids function
CREATE POLICY "Users access own or team/admin jobs"
ON public.sas_jobs
FOR ALL
TO public
USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));

-- Enable realtime for jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.sas_jobs;