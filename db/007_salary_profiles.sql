-- Salary metadata only; no automatic salary calculation or payment.
CREATE TABLE IF NOT EXISTS chico_next.salary_profiles (
 admin_id uuid PRIMARY KEY REFERENCES chico_next.admins(id) ON DELETE RESTRICT,
 rp_name text NOT NULL DEFAULT '' CHECK (char_length(rp_name)<=120),
 rp_server text NOT NULL DEFAULT '' CHECK (char_length(rp_server)<=80),
 client_id uuid,
 bonus_count integer NOT NULL DEFAULT 0 CHECK (bonus_count BETWEEN 0 AND 99),
 bonus_amount numeric(14,2) CHECK (bonus_amount>=0),
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (bonus_count>0 OR bonus_amount IS NULL)
);
ALTER TABLE chico_next.salary_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE chico_next.salary_profiles FROM PUBLIC, anon, authenticated;
