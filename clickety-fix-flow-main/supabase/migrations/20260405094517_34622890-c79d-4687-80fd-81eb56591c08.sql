
-- Profile table
CREATE TABLE public.sas_profile (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sas_profile_user_id_idx ON public.sas_profile (user_id);
ALTER TABLE public.sas_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own profile" ON public.sas_profile FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Clients table
CREATE TABLE public.sas_clients (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sas_clients_user_id_idx ON public.sas_clients (user_id);
ALTER TABLE public.sas_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own clients" ON public.sas_clients FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Invoices table
CREATE TABLE public.sas_invoices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sas_invoices_user_id_idx ON public.sas_invoices (user_id);
ALTER TABLE public.sas_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own invoices" ON public.sas_invoices FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Quotes table
CREATE TABLE public.sas_quotes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sas_quotes_user_id_idx ON public.sas_quotes (user_id);
ALTER TABLE public.sas_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quotes" ON public.sas_quotes FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Expenses table
CREATE TABLE public.sas_expenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sas_expenses_user_id_idx ON public.sas_expenses (user_id);
ALTER TABLE public.sas_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own expenses" ON public.sas_expenses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Income Sources table
CREATE TABLE public.sas_income_sources (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sas_income_sources_user_id_idx ON public.sas_income_sources (user_id);
ALTER TABLE public.sas_income_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own income sources" ON public.sas_income_sources FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Services table
CREATE TABLE public.sas_services (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sas_services_user_id_idx ON public.sas_services (user_id);
ALTER TABLE public.sas_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own services" ON public.sas_services FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Documents table
CREATE TABLE public.sas_documents (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sas_documents_user_id_idx ON public.sas_documents (user_id);
ALTER TABLE public.sas_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents" ON public.sas_documents FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Suppliers table
CREATE TABLE public.sas_suppliers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sas_suppliers_user_id_idx ON public.sas_suppliers (user_id);
ALTER TABLE public.sas_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own suppliers" ON public.sas_suppliers FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage bucket for receipts and documents
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false);

CREATE POLICY "Users can upload own receipts" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can view own receipts" ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Users can delete own receipts" ON storage.objects FOR DELETE
  USING (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[2]);
