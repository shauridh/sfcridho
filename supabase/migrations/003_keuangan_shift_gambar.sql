-- ============================================
-- Migration 003: Keuangan, Open/Close, Gambar Produk
-- ============================================

-- 1. Tabel Kas (pencatatan keuangan masuk/keluar)
CREATE TABLE IF NOT EXISTS kas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe        TEXT NOT NULL CHECK (tipe IN ('masuk', 'keluar')),
  nominal     INTEGER NOT NULL,
  keterangan  TEXT NOT NULL,
  kategori    TEXT NOT NULL DEFAULT 'Lainnya',
  waktu       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kas_waktu ON kas(waktu);
CREATE INDEX IF NOT EXISTS idx_kas_tipe ON kas(tipe);

-- 2. Tabel Shift (open/close kasir)
CREATE TABLE IF NOT EXISTS shift (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buka_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  tutup_at        TIMESTAMPTZ,
  uang_buka       INTEGER NOT NULL DEFAULT 0,
  uang_drawer     INTEGER,
  uang_ambil      INTEGER,
  total_transaksi INTEGER NOT NULL DEFAULT 0,
  total_nominal   INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_shift_status ON shift(status);
CREATE INDEX IF NOT EXISTS idx_shift_buka_at ON shift(buka_at);

-- 3. Tambah kolom shift_id di transaksi
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shift(id);

-- 4. Tambah kolom gambar di produk
ALTER TABLE produk ADD COLUMN IF NOT EXISTS gambar TEXT;

-- 5. RLS policies untuk tabel baru
ALTER TABLE kas ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_kas" ON kas;
CREATE POLICY "allow_all_kas" ON kas FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE shift ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_shift" ON shift;
CREATE POLICY "allow_all_shift" ON shift FOR ALL USING (true) WITH CHECK (true);

-- 6. Storage bucket untuk gambar produk
INSERT INTO storage.buckets (id, name, public) VALUES ('produk-images', 'produk-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'produk-images');
CREATE POLICY "Authenticated Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'produk-images');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'produk-images');
