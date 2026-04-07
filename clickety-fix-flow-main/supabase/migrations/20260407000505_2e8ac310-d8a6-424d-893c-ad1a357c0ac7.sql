DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sas_clients','sas_invoices','sas_quotes','sas_expenses',
    'sas_income_sources','sas_services','sas_documents',
    'sas_suppliers','sas_assets','sas_properties','sas_profile'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;