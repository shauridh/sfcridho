-- Migration 011: Kategori table (separate stok & produk)
CREATE TABLE IF NOT EXISTS kategori (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('stok', 'produk')),
  urutan INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_kategori" ON kategori;
CREATE POLICY "allow_all_kategori" ON kategori FOR ALL USING (true) WITH CHECK (true);

-- Seed stok kategori
INSERT INTO kategori (nama, tipe, urutan) VALUES
  ('Ayam', 'stok', 1), ('Tepung & Bumbu', 'stok', 2),
  ('Minyak', 'stok', 3), ('Nasi & Karbohidrat', 'stok', 4),
  ('Minuman', 'stok', 5), ('Kemasan', 'stok', 6), ('Lainnya', 'stok', 7)
ON CONFLICT DO NOTHING;

-- Seed produk kategori
INSERT INTO kategori (nama, tipe, urutan) VALUES
  ('Ayam', 'produk', 1), ('Geprek', 'produk', 2),
  ('Paket', 'produk', 3), ('Minuman', 'produk', 4),
  ('Tambahan', 'produk', 5), ('Lainnya', 'produk', 6)
ON CONFLICT DO NOTHING;
