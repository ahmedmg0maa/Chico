-- CHICO Next Generation: intentionally isolated from legacy public/chico schemas.
-- Run once in Supabase SQL Editor on a TEST/Preview project first.
BEGIN;
CREATE SCHEMA IF NOT EXISTS chico_next;
CREATE TABLE IF NOT EXISTS chico_next.admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, rank text NOT NULL CHECK (rank IN ('Responsible','Administrator','Moderator','SN.Helper','Helper')),
  active boolean NOT NULL DEFAULT true, in_reporting boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1000, joined_on date, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chico_admin_name_not_blank CHECK (length(trim(name)) BETWEEN 1 AND 80)
);
CREATE UNIQUE INDEX IF NOT EXISTS chico_next_admin_name_ci ON chico_next.admins(lower(name));
CREATE TABLE IF NOT EXISTS chico_next.rank_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid NOT NULL REFERENCES chico_next.admins(id) ON DELETE CASCADE,
  previous_rank text, new_rank text NOT NULL, changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chico_next.weekly_status (
  week_start date PRIMARY KEY,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  closed_at timestamptz, closure_note text
);
CREATE TABLE IF NOT EXISTS chico_next.readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES chico_next.admins(id) ON DELETE CASCADE,
  from_date date NOT NULL, to_date date NOT NULL, week_start date NOT NULL,
  tickets_counter integer CHECK (tickets_counter >= 0), tickets_delta integer CHECK (tickets_delta >= 0),
  flags_counter integer CHECK (flags_counter >= 0), flags_baseline integer CHECK (flags_baseline >= 0), flags_delta integer CHECK (flags_delta >= 0),
  hours numeric(8,2) CHECK (hours >= 0), rating numeric(3,2) CHECK (rating >= 0 AND rating <= 5),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chico_reading_dates CHECK (from_date <= to_date),
  CONSTRAINT chico_one_reading_per_admin_end UNIQUE(admin_id, to_date)
);
CREATE INDEX IF NOT EXISTS chico_next_readings_period ON chico_next.readings(week_start,admin_id,to_date);
CREATE TABLE IF NOT EXISTS chico_next.audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action text NOT NULL, summary text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chico_next.backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), label text NOT NULL,
  snapshot jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS chico_next.import_staging (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_hash text NOT NULL, payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), committed_at timestamptz
);
CREATE INDEX IF NOT EXISTS chico_next_staging_created ON chico_next.import_staging(created_at);
CREATE TABLE IF NOT EXISTS chico_next.login_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash text NOT NULL, failed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chico_next_login_limit ON chico_next.login_attempts(ip_hash,failed_at);
-- Browser must NEVER access this private schema using the publishable key.
REVOKE ALL ON SCHEMA chico_next FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA chico_next FROM PUBLIC, anon, authenticated;
COMMIT;
