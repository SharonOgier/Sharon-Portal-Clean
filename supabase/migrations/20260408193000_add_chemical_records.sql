-- Chemical use records (Australia spray diary compliance)
CREATE TABLE IF NOT EXISTS public.sas_chemical_records (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL
);

ALTER TABLE public.sas_chemical_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own or team/admin chemical records" ON public.sas_chemical_records;
CREATE POLICY "Users access own or team/admin chemical records"
ON public.sas_chemical_records
FOR ALL
TO public
USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_sas_chemical_records_user_id
  ON public.sas_chemical_records (user_id);
CREATE INDEX IF NOT EXISTS idx_sas_chemical_records_date
  ON public.sas_chemical_records ((data->>'date'));
CREATE INDEX IF NOT EXISTS idx_sas_chemical_records_property
  ON public.sas_chemical_records ((data->>'propertyId'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sas_chemical_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sas_chemical_records;
  END IF;
END $$;
