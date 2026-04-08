-- Supplier price lists
CREATE TABLE IF NOT EXISTS public.sas_supplier_price_lists (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  updated_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid NOT NULL
);

ALTER TABLE public.sas_supplier_price_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access own or team/admin supplier price lists" ON public.sas_supplier_price_lists;
CREATE POLICY "Users access own or team/admin supplier price lists"
ON public.sas_supplier_price_lists
FOR ALL
TO public
USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_sas_supplier_price_lists_user_id
  ON public.sas_supplier_price_lists (user_id);
CREATE INDEX IF NOT EXISTS idx_sas_supplier_price_lists_supplier
  ON public.sas_supplier_price_lists ((data->>'supplierName'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.sas_supplier_price_lists;
