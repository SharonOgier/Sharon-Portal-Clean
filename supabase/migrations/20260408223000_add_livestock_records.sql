-- Livestock records for mobs, movements, treatments, weights, sales, purchases, calving
CREATE TABLE IF NOT EXISTS public.sas_livestock_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL
);

ALTER TABLE public.sas_livestock_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own or team/admin livestock records" ON public.sas_livestock_records;
CREATE POLICY "Users access own or team/admin livestock records"
ON public.sas_livestock_records
FOR ALL
TO public
USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_sas_livestock_records_user_id
  ON public.sas_livestock_records (user_id);
CREATE INDEX IF NOT EXISTS idx_sas_livestock_records_kind
  ON public.sas_livestock_records ((data->>'kind'));
CREATE INDEX IF NOT EXISTS idx_sas_livestock_records_mob
  ON public.sas_livestock_records ((data->>'mobId'));
CREATE INDEX IF NOT EXISTS idx_sas_livestock_records_date
  ON public.sas_livestock_records ((data->>'date'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sas_livestock_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sas_livestock_records;
  END IF;
END $$;
