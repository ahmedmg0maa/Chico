-- Live points ledger: independent of OneState performance numbers.
-- New tables only; no data backfill, no changes to existing CHICO records.
BEGIN;
CREATE TABLE IF NOT EXISTS chico_next.point_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id=1),
  config jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(config)='object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO chico_next.point_settings(id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS chico_next.point_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES chico_next.admins(id) ON DELETE SET NULL,
  admin_name text NOT NULL CHECK (length(btrim(admin_name)) BETWEEN 1 AND 80),
  category text NOT NULL CHECK (category IN (
    'shift_attended','support_response','competition_win','recognition',
    'shift_missed','warning','reprimand'
  )),
  delta integer NOT NULL CHECK (delta BETWEEN -100000 AND 100000 AND delta<>0),
  event_date date NOT NULL,
  note text NOT NULL CHECK (length(btrim(note)) BETWEEN 1 AND 400),
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  CONSTRAINT chico_point_category_sign CHECK (
    (category IN ('shift_attended','support_response','competition_win','recognition') AND delta>0)
    OR (category IN ('shift_missed','warning','reprimand') AND delta<0)
  )
);
CREATE INDEX IF NOT EXISTS chico_points_admin_date ON chico_next.point_events(admin_id,event_date DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS chico_points_created ON chico_next.point_events(created_at DESC);
-- Server-only PostgreSQL access. Never enable direct browser write APIs.
ALTER TABLE chico_next.point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chico_next.point_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chico_next.point_settings,chico_next.point_events FROM PUBLIC,anon,authenticated;
COMMIT;
