-- ============================================
-- Migration 005: Opex, Hutang/Piutang, wa_sender
-- ============================================

-- 1. Tabel Opex (pengeluaran tetap bulanan)
CREATE TABLE IF NOT EXISTS opex (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  nominal INTEGER NOT NULL,
  frekuensi TEXT DEFAULT 'bulanan',
  jatuh_tempo INTEGER,
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE opex ENABLE ROW LEVEL SECURITY;
ALTER TABLE opex FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_opex" ON opex;
CREATE POLICY "allow_all_opex" ON opex FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabel Hutang & Piutang
CREATE TABLE IF NOT EXISTS piutang (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pihak TEXT NOT NULL,
  nominal INTEGER NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('hutang', 'piutang')),
  keterangan TEXT,
  status TEXT DEFAULT 'belum' CHECK (status IN ('belum', 'lunas')),
  jatuh_tempo DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE piutang ENABLE ROW LEVEL SECURITY;
ALTER TABLE piutang FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_piutang" ON piutang;
CREATE POLICY "allow_all_piutang" ON piutang FOR ALL USING (true) WITH CHECK (true);

-- 3. Tambah setting wa_sender
INSERT INTO settings (key, value) VALUES ('wa_sender', '')
ON CONFLICT (key) DO NOTHING;


