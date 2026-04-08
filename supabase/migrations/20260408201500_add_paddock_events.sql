-- Paddock history events (permanent chronology with archive support)
CREATE TABLE IF NOT EXISTS public.sas_paddock_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL
);

ALTER TABLE public.sas_paddock_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own or team/admin paddock events" ON public.sas_paddock_events;
CREATE POLICY "Users access own or team/admin paddock events"
ON public.sas_paddock_events
FOR ALL
TO public
USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_sas_paddock_events_user_id
  ON public.sas_paddock_events (user_id);
CREATE INDEX IF NOT EXISTS idx_sas_paddock_events_property
  ON public.sas_paddock_events ((data->>'propertyId'));
CREATE INDEX IF NOT EXISTS idx_sas_paddock_events_sub_location
  ON public.sas_paddock_events ((data->>'subLocationId'));
CREATE INDEX IF NOT EXISTS idx_sas_paddock_events_date
  ON public.sas_paddock_events ((data->>'date'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'sas_paddock_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sas_paddock_events;
  END IF;
END $$;
