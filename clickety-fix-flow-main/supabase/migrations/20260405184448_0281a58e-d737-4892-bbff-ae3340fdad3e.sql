
-- Drop existing policies on all sas_* tables and recreate with multi-user support

-- sas_clients
DROP POLICY IF EXISTS "Users manage own clients" ON public.sas_clients;
CREATE POLICY "Users access own or team/admin clients" ON public.sas_clients FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));

-- sas_documents
DROP POLICY IF EXISTS "Users manage own documents" ON public.sas_documents;
CREATE POLICY "Users access own or team/admin documents" ON public.sas_documents FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));

-- sas_expenses
DROP POLICY IF EXISTS "Users manage own expenses" ON public.sas_expenses;
CREATE POLICY "Users access own or team/admin expenses" ON public.sas_expenses FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));

-- sas_income_sources
DROP POLICY IF EXISTS "Users manage own income sources" ON public.sas_income_sources;
CREATE POLICY "Users access own or team/admin income_sources" ON public.sas_income_sources FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));

-- sas_invoices
DROP POLICY IF EXISTS "Users manage own invoices" ON public.sas_invoices;
CREATE POLICY "Users access own or team/admin invoices" ON public.sas_invoices FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));

-- sas_profile
DROP POLICY IF EXISTS "Users manage own profile" ON public.sas_profile;
CREATE POLICY "Users access own or team/admin profile" ON public.sas_profile FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));

-- sas_quotes
DROP POLICY IF EXISTS "Users manage own quotes" ON public.sas_quotes;
CREATE POLICY "Users access own or team/admin quotes" ON public.sas_quotes FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));

-- sas_services
DROP POLICY IF EXISTS "Users manage own services" ON public.sas_services;
CREATE POLICY "Users access own or team/admin services" ON public.sas_services FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));

-- sas_suppliers
DROP POLICY IF EXISTS "Users manage own suppliers" ON public.sas_suppliers;
CREATE POLICY "Users access own or team/admin suppliers" ON public.sas_suppliers FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));

-- sas_payment_reminders
DROP POLICY IF EXISTS "Users manage own reminders" ON public.sas_payment_reminders;
CREATE POLICY "Users access own or team/admin reminders" ON public.sas_payment_reminders FOR ALL
USING (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())))
WITH CHECK (user_id IN (SELECT public.get_accessible_user_ids(auth.uid())));
