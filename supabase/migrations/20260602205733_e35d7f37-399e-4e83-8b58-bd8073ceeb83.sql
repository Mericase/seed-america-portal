
CREATE POLICY "Users upload own verification docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'verification' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own verification docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'verification' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own verification docs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'verification' AND auth.uid()::text = (storage.foldername(name))[1]);
