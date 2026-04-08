CREATE TABLE public.sas_assets (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sas_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own or team/admin assets"
  ON public.sas_assets
  FOR ALL
  USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
  WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));