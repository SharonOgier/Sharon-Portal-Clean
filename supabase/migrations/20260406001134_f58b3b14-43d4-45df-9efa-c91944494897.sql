
-- Create properties table following existing JSONB pattern
CREATE TABLE public.sas_properties (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sas_properties ENABLE ROW LEVEL SECURITY;

-- RLS policy matching existing pattern
CREATE POLICY "Users access own or team/admin properties"
  ON public.sas_properties
  FOR ALL
  USING (user_id IN (SELECT get_accessible_user_ids(auth.uid())))
  WITH CHECK (user_id IN (SELECT get_accessible_user_ids(auth.uid())));

-- Create storage bucket for property photos
INSERT INTO storage.buckets (id, name, public) VALUES ('property-photos', 'property-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for property photos
CREATE POLICY "Users can upload property photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'property-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view property photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete property photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'property-photos' AND auth.uid() IS NOT NULL);
