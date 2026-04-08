
-- Add subcontractor to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'subcontractor';

-- Subcontractor assignments table
CREATE TABLE public.sas_subcontractor_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_user_id uuid NOT NULL,
  job_owner_user_id uuid NOT NULL,
  job_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sas_subcontractor_assignments ENABLE ROW LEVEL SECURITY;

-- Subcontractors see their own assignments; owners and admins see all
CREATE POLICY "Subcontractors view own assignments"
  ON public.sas_subcontractor_assignments FOR SELECT
  USING (
    auth.uid() = subcontractor_user_id
    OR auth.uid() = job_owner_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners manage assignments"
  ON public.sas_subcontractor_assignments FOR INSERT
  WITH CHECK (
    auth.uid() = job_owner_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners update assignments"
  ON public.sas_subcontractor_assignments FOR UPDATE
  USING (
    auth.uid() = job_owner_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owners delete assignments"
  ON public.sas_subcontractor_assignments FOR DELETE
  USING (
    auth.uid() = job_owner_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- Subcontractor cost submissions table
CREATE TABLE public.sas_subcontractor_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_user_id uuid NOT NULL,
  job_owner_user_id uuid NOT NULL,
  job_id text NOT NULL,
  cost_type text NOT NULL DEFAULT 'labour',
  description text NOT NULL DEFAULT '',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  hours numeric(6,2),
  rate numeric(10,2),
  receipt_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sas_subcontractor_costs ENABLE ROW LEVEL SECURITY;

-- Subcontractors can create and view their own submissions
CREATE POLICY "Subcontractors manage own costs"
  ON public.sas_subcontractor_costs FOR SELECT
  USING (
    auth.uid() = subcontractor_user_id
    OR auth.uid() = job_owner_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Subcontractors insert own costs"
  ON public.sas_subcontractor_costs FOR INSERT
  WITH CHECK (auth.uid() = subcontractor_user_id);

CREATE POLICY "Subcontractors update own pending costs"
  ON public.sas_subcontractor_costs FOR UPDATE
  USING (
    (auth.uid() = subcontractor_user_id AND status = 'pending')
    OR auth.uid() = job_owner_user_id
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Subcontractors delete own pending costs"
  ON public.sas_subcontractor_costs FOR DELETE
  USING (
    auth.uid() = subcontractor_user_id AND status = 'pending'
  );

-- Create storage bucket for subcontractor receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('subcontractor-receipts', 'subcontractor-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for subcontractor receipts
CREATE POLICY "Subcontractors upload own receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'subcontractor-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Subcontractors view own receipts"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'subcontractor-receipts'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );
