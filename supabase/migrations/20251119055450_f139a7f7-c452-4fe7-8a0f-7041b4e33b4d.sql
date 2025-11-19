-- Add RLS policies for email-attachments storage bucket

-- Policy: Users can view their own attachments
CREATE POLICY "Users can view own attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can upload their own attachments
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own attachments
CREATE POLICY "Users can update own attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'email-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);