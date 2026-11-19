BEGIN;
ALTER TABLE chico_next.admins DROP CONSTRAINT IF EXISTS admins_rank_check;
ALTER TABLE chico_next.admins ADD CONSTRAINT admins_rank_check
  CHECK (rank IN ('Responsible','Administrator','Moderator','SN.Helper','Helper','M.'));
ALTER TABLE chico_next.readings
  ADD COLUMN IF NOT EXISTS recorded_rank text,
  ADD COLUMN IF NOT EXISTS recorded_reporting boolean;

-- Keep legacy eligibility as last known; existing data has no archive of membership status.
-- Keep a historical rank when the roster recorded a change after the coverage date.
UPDATE chico_next.readings r SET
  recorded_rank = COALESCE((
    SELECT h.previous_rank FROM chico_next.rank_history h
    WHERE h.admin_id=r.admin_id AND h.previous_rank IS NOT NULL
      AND (h.changed_at AT TIME ZONE 'Africa/Cairo')::date > r.to_date
    ORDER BY h.changed_at, h.id LIMIT 1
  ), a.rank),
  recorded_reporting = a.active AND a.in_reporting
FROM chico_next.admins a
WHERE a.id=r.admin_id AND r.recorded_rank IS NULL;

CREATE OR REPLACE FUNCTION chico_next.capture_reading_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  SELECT COALESCE((
    SELECT h.previous_rank FROM chico_next.rank_history h
    WHERE h.admin_id=a.id AND h.previous_rank IS NOT NULL
      AND (h.changed_at AT TIME ZONE 'Africa/Cairo')::date > NEW.to_date
    ORDER BY h.changed_at, h.id LIMIT 1
  ), a.rank), a.active AND a.in_reporting
  INTO NEW.recorded_rank, NEW.recorded_reporting
  FROM chico_next.admins a WHERE a.id=NEW.admin_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS capture_reading_insert ON chico_next.readings;
CREATE TRIGGER capture_reading_insert BEFORE INSERT ON chico_next.readings
  FOR EACH ROW EXECUTE FUNCTION chico_next.capture_reading_identity();
DROP TRIGGER IF EXISTS capture_reading_reassignment ON chico_next.readings;
CREATE TRIGGER capture_reading_reassignment BEFORE UPDATE OF admin_id,to_date ON chico_next.readings
  FOR EACH ROW WHEN (OLD.admin_id IS DISTINCT FROM NEW.admin_id OR OLD.to_date IS DISTINCT FROM NEW.to_date)
  EXECUTE FUNCTION chico_next.capture_reading_identity();
COMMIT;
