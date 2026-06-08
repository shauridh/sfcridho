-- Migration 021: Addons table for product extras (nasi, sambal, dll)
CREATE TABLE IF NOT EXISTS addons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama       TEXT NOT NULL,
  harga      INTEGER NOT NULL DEFAULT 0,
  aktif      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE addons FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_addons" ON addons;
CREATE POLICY "allow_all_addons" ON addons FOR ALL USING (true) WITH CHECK (true);
