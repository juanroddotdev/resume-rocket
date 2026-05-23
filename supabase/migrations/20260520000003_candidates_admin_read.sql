CREATE POLICY candidates_read_authenticated ON candidates
  FOR SELECT TO authenticated USING (true);
