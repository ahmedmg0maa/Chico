-- CHICO v2 — apply first to isolated preview database; safe reversible additive schema.
BEGIN;
ALTER TABLE chico_next.admins ADD COLUMN IF NOT EXISTS admin_level smallint CHECK (admin_level BETWEEN 1 AND 3);
ALTER TABLE chico_next.admins ADD COLUMN IF NOT EXISTS shift_label text CHECK (shift_label IS NULL OR char_length(shift_label) <= 120);
CREATE TABLE IF NOT EXISTS chico_next.shift_history (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 admin_id uuid NOT NULL REFERENCES chico_next.admins(id) ON DELETE CASCADE,
 previous_shift text,
 new_shift text,
 changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chico_next_shift_history_admin_time ON chico_next.shift_history(admin_id,changed_at DESC);
REVOKE ALL ON chico_next.shift_history FROM PUBLIC,anon,authenticated;
COMMIT;
