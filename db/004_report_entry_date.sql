-- Keep historical coverage and user-declared report entry date separate.
BEGIN;
ALTER TABLE chico_next.readings ADD COLUMN IF NOT EXISTS report_entered_on date;
UPDATE chico_next.readings SET report_entered_on=(created_at AT TIME ZONE 'Africa/Cairo')::date WHERE report_entered_on IS NULL;
ALTER TABLE chico_next.readings ALTER COLUMN report_entered_on SET DEFAULT ((now() AT TIME ZONE 'Africa/Cairo')::date);
ALTER TABLE chico_next.readings ALTER COLUMN report_entered_on SET NOT NULL;
CREATE INDEX IF NOT EXISTS chico_readings_report_entered_on_idx ON chico_next.readings(report_entered_on);
REVOKE ALL ON chico_next.readings FROM PUBLIC,anon,authenticated;
COMMIT;
