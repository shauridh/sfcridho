-- ============================================
-- FIX 1: GRANT table permissions to anon & authenticated roles
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON bahan_baku TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON produk TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON resep TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transaksi TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transaksi_item TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stok_log TO anon, authenticated;

-- Sequence permissions (for auto-increment if needed)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- FIX 2: GRANT EXECUTE on process_transaction RPC
-- ============================================
GRANT EXECUTE ON FUNCTION process_transaction(INTEGER, INTEGER, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION process_transaction(INTEGER, INTEGER, JSONB) TO authenticated;

-- ============================================
-- FIX 3: Seed Data — Bahan Baku (idempotent)
-- ============================================
INSERT INTO bahan_baku (nama, kategori, sat_beli, isi_per_pak, sat_dasar, stok, reorder_point, harga_beli)
VALUES
  ('Ayam Kampung', 'Ayam', 'kg', 9, 'potong', 72, 18, 55000),
  ('Terigu Segitiga Biru', 'Tepung & Bumbu', 'pak', 1000, 'gram', 25000, 3000, 13000),
  ('Minyak Goreng', 'Minyak', 'jerigen', 5000, 'ml', 40000, 10000, 65000),
  ('Bumbu Marinasi', 'Tepung & Bumbu', 'pouch', 80, 'gram', 320, 160, 15000),
  ('Cabai Rawit', 'Tepung & Bumbu', 'kg', 1000, 'gram', 5000, 2000, 40000),
  ('Beras', 'Nasi & Karbohidrat', 'karung', 5000, 'gram', 30000, 5000, 65000),
  ('Gula Pasir', 'Minuman', 'kg', 1000, 'gram', 8000, 2000, 14000),
  ('Teh Celup', 'Minuman', 'pack', 50, 'sachet', 200, 50, 12000),
  ('Es Batu', 'Minuman', 'kg', 1000, 'gram', 10000, 3000, 5000),
  ('Kemasan Box', 'Kemasan', 'pack', 50, 'pcs', 300, 100, 25000),
  ('Kemasan Mika', 'Kemasan', 'pack', 50, 'pcs', 250, 100, 20000),
  ('Saus Sambal', 'Tepung & Bumbu', 'botol', 500, 'ml', 2000, 500, 18000)
ON CONFLICT DO NOTHING;

-- ============================================
-- FIX 4: Seed Data — Produk
-- ============================================
INSERT INTO produk (nama, kategori, harga)
VALUES
  ('Ayam Goreng Dada', 'Ayam', 15000),
  ('Ayam Goreng Sayap', 'Ayam', 12000),
  ('Ayam Goreng Paha Atas', 'Ayam', 14000),
  ('Ayam Goreng Paha Bawah', 'Ayam', 13000),
  ('Geprek Dada', 'Geprek', 17000),
  ('Geprek Sayap', 'Geprek', 14000),
  ('Geprek Paha Atas', 'Geprek', 16000),
  ('Geprek Paha Bawah', 'Geprek', 15000),
  ('Paket Komplit A', 'Paket', 25000),
  ('Paket Komplit B', 'Paket', 22000),
  ('Nasi Putih', 'Tambahan', 5000),
  ('Es Teh', 'Minuman', 5000),
  ('Es Jeruk', 'Minuman', 6000)
ON CONFLICT DO NOTHING;

-- ============================================
-- FIX 5: Seed Data — Resep (BOM)
-- ============================================
-- Helper: insert resep only if not already exists
-- Ayam Goreng Dada: 1 potong + 50g terigu + 200ml minyak
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Dada' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Dada' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Dada' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Ayam Goreng Sayap
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Sayap' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Sayap' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Sayap' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Ayam Goreng Paha Atas
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Paha Atas' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Paha Atas' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Paha Atas' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Ayam Goreng Paha Bawah
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Paha Bawah' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Paha Bawah' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Ayam Goreng Paha Bawah' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Geprek Dada: same as goreng + cabai
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Dada' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Dada' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Dada' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 20, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Dada' AND b.nama = 'Cabai Rawit'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Geprek Sayap
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Sayap' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Sayap' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Sayap' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 20, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Sayap' AND b.nama = 'Cabai Rawit'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Geprek Paha Atas
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Paha Atas' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Paha Atas' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Paha Atas' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 20, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Paha Atas' AND b.nama = 'Cabai Rawit'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Geprek Paha Bawah
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Paha Bawah' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Paha Bawah' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Paha Bawah' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 20, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Geprek Paha Bawah' AND b.nama = 'Cabai Rawit'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Paket Komplit A: 1 ayam + nasi + es teh + kemasan box
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Beras'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'sachet' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Teh Celup'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 100, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Es Batu'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'pcs' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Kemasan Box'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Paket Komplit B: 1 ayam + nasi + es teh + kemasan mika
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Ayam Kampung'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Terigu Segitiga Biru'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Minyak Goreng'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Beras'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'sachet' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Teh Celup'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 100, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Es Batu'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'pcs' FROM produk p, bahan_baku b
WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Kemasan Mika'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Nasi Putih
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Nasi Putih' AND b.nama = 'Beras'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Es Teh
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'sachet' FROM produk p, bahan_baku b
WHERE p.nama = 'Es Teh' AND b.nama = 'Teh Celup'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 30, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Es Teh' AND b.nama = 'Gula Pasir'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 100, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Es Teh' AND b.nama = 'Es Batu'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);

-- Es Jeruk
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 40, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Es Jeruk' AND b.nama = 'Gula Pasir'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 100, 'gram' FROM produk p, bahan_baku b
WHERE p.nama = 'Es Jeruk' AND b.nama = 'Es Batu'
  AND NOT EXISTS (SELECT 1 FROM resep r WHERE r.produk_id = p.id AND r.bahan_id = b.id);
