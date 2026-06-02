-- Migration 008: Media Penyimpanan (Akun) + Kas sumber/tujuan

-- 1. Tabel Akun (media penyimpanan uang)
CREATE TABLE IF NOT EXISTS akun (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  tipe TEXT NOT NULL DEFAULT 'kas_fisik' CHECK (tipe IN ('bank', 'ewallet', 'kas_fisik')),
  warna TEXT DEFAULT '#6B7280',
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE akun ENABLE ROW LEVEL SECURITY;
ALTER TABLE akun FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_akun" ON akun;
CREATE POLICY "allow_all_akun" ON akun FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_akun_aktif ON akun(aktif);


-- 3. Tambah kolom sumber & tujuan di kas
ALTER TABLE kas ADD COLUMN IF NOT EXISTS sumber_akun_id UUID REFERENCES akun(id);
ALTER TABLE kas ADD COLUMN IF NOT EXISTS tujuan_akun_id UUID REFERENCES akun(id);

