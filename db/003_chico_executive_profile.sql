-- CHICO V7: optional profile attributes. Existing names, readings and rank history are untouched.
BEGIN;
ALTER TABLE chico_next.admins
 ADD COLUMN IF NOT EXISTS full_name text,
 ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Cairo',
 ADD COLUMN IF NOT EXISTS supervisor_id uuid REFERENCES chico_next.admins(id) ON DELETE SET NULL;
ALTER TABLE chico_next.admins DROP CONSTRAINT IF EXISTS chico_full_name_max;
ALTER TABLE chico_next.admins ADD CONSTRAINT chico_full_name_max CHECK (full_name IS NULL OR char_length(full_name)<=120);
ALTER TABLE chico_next.admins DROP CONSTRAINT IF EXISTS chico_notes_max;
ALTER TABLE chico_next.admins ADD CONSTRAINT chico_notes_max CHECK (char_length(notes)<=2000);
ALTER TABLE chico_next.admins DROP CONSTRAINT IF EXISTS chico_timezone_enum;
ALTER TABLE chico_next.admins ADD CONSTRAINT chico_timezone_enum CHECK (timezone IN ('Africa/Cairo','Asia/Riyadh','UTC'));
CREATE INDEX IF NOT EXISTS chico_admins_supervisor ON chico_next.admins(supervisor_id);
REVOKE ALL ON chico_next.admins FROM PUBLIC,anon,authenticated;
COMMIT;
