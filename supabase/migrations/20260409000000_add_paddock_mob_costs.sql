-- Tables for paddock and mob cost tracking
CREATE TABLE IF NOT EXISTS public.sas_paddock_costs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.sas_paddock_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own paddock costs" ON public.sas_paddock_costs
  FOR ALL TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.sas_mob_costs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.sas_mob_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mob costs" ON public.sas_mob_costs
  FOR ALL TO public
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sas_paddock_costs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sas_paddock_costs;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sas_mob_costs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sas_mob_costs;
  END IF;
END $$;
