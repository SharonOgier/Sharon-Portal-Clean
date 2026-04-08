-- Machinery logs for tracking usage, service, and maintenance
CREATE TABLE IF NOT EXISTS public.sas_machinery_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL
);

ALTER TABLE public.sas_machinery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own or team/admin machinery logs" ON public.sas_machinery_logs;
CREATE POLICY "Users access own or team/admin machinery logs"
ON public.sas_machinery_logs
FOR ALL
TO public
USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_sas_machinery_logs_user_id
  ON public.sas_machinery_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_sas_machinery_logs_date
  ON public.sas_machinery_logs ((data->>'date'));
CREATE INDEX IF NOT EXISTS idx_sas_machinery_logs_asset
  ON public.sas_machinery_logs ((data->>'assetId'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sas_machinery_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sas_machinery_logs;
  END IF;
END $$;
