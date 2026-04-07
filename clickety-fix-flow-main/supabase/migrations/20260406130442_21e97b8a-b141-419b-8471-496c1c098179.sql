-- Create the job-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true);

-- Allow public read access for job photos (needed for job sheets/reports)
CREATE POLICY "Job photos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'job-photos');

-- Allow authenticated users to upload photos to their own folder
CREATE POLICY "Users can upload job photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own photos
CREATE POLICY "Users can update own job photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own job photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);