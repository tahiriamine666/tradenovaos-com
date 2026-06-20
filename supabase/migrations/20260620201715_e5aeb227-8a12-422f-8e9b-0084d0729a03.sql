
CREATE POLICY "community_uploads_read_auth"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'community-uploads');

CREATE POLICY "community_uploads_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "community_uploads_update_own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'community-uploads' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'community-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "community_uploads_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'community-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
