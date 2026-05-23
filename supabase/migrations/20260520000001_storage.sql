-- Storage policies for resumes bucket
CREATE POLICY resumes_service_all ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'resumes')
  WITH CHECK (bucket_id = 'resumes');

CREATE POLICY resumes_authenticated_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes');
