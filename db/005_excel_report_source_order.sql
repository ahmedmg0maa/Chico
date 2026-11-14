-- CHICO Phase 3: preserve exactly how names/rows appeared in the uploaded game Excel.
-- Existing readings stay valid; no retroactive staff reorder or rank changes.
ALTER TABLE chico_next.readings
 ADD COLUMN IF NOT EXISTS source_row integer,
 ADD COLUMN IF NOT EXISTS source_name text;
COMMENT ON COLUMN chico_next.readings.source_row IS 'Original one-based worksheet row from a reviewed Excel upload; NULL for manual/historical readings';
COMMENT ON COLUMN chico_next.readings.source_name IS 'Exact original game display name from Excel; roster name and rank remain authoritative';
CREATE INDEX IF NOT EXISTS chico_next_readings_source_row
 ON chico_next.readings(week_start,source_row) WHERE source_row IS NOT NULL;
