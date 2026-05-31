-- PostgREST upsert(on_conflict=source_id) requires a UNIQUE constraint, not a partial index.
DROP INDEX IF EXISTS hospitals_source_id_unique;

ALTER TABLE hospitals
  DROP CONSTRAINT IF EXISTS hospitals_source_id_key;

ALTER TABLE hospitals
  ADD CONSTRAINT hospitals_source_id_key UNIQUE (source_id);
