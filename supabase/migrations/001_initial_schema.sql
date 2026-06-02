-- ============================================
-- Sabana FC POS — Supabase Schema
-- ============================================

-- Bahan Baku
CREATE TABLE bahan_baku (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama          TEXT NOT NULL,
  kategori      TEXT NOT NULL DEFAULT 'Lainnya',
  sat_beli      TEXT NOT NULL,
  isi_per_pak   NUMERIC NOT NULL,
  sat_dasar     TEXT NOT NULL,
  stok          NUMERIC NOT NULL DEFAULT 0,
  reorder_point NUMERIC NOT NULL DEFAULT 0,
  harga_beli    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Produk / Menu
CREATE TABLE produk (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama       TEXT NOT NULL,
  kategori   TEXT NOT NULL DEFAULT 'Lainnya',
  harga      INTEGER NOT NULL,
  aktif      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BOM / Resep
CREATE TABLE resep (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produk_id UUID NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
  bahan_id  UUID NOT NULL REFERENCES bahan_baku(id) ON DELETE CASCADE,
  qty       NUMERIC NOT NULL,
  sat       TEXT
);

-- Transaksi
CREATE TABLE transaksi (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waktu     TIMESTAMPTZ NOT NULL DEFAULT now(),
  total     INTEGER NOT NULL,
  bayar     INTEGER NOT NULL,
  kembalian INTEGER NOT NULL
);

-- Item Transaksi
CREATE TABLE transaksi_item (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaksi_id  UUID NOT NULL REFERENCES transaksi(id) ON DELETE CASCADE,
  produk_id     UUID NOT NULL REFERENCES produk(id),
  nama_snapshot TEXT NOT NULL,
  harga         INTEGER NOT NULL,
  qty           INTEGER NOT NULL
);

-- Log Stok
CREATE TABLE stok_log (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bahan_id  UUID NOT NULL REFERENCES bahan_baku(id),
  tipe      TEXT NOT NULL CHECK (tipe IN ('deduct', 'restock', 'adjust')),
  qty       NUMERIC NOT NULL,
  referensi TEXT,
  waktu     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_resep_produk ON resep(produk_id);
CREATE INDEX idx_resep_bahan ON resep(bahan_id);
CREATE INDEX idx_transaksi_waktu ON transaksi(waktu);
CREATE INDEX idx_transaksi_item_transaksi ON transaksi_item(transaksi_id);
CREATE INDEX idx_stok_log_bahan ON stok_log(bahan_id);
CREATE INDEX idx_stok_log_waktu ON stok_log(waktu);

-- ============================================
-- RPC: Process Transaction (Auto Deduct)
-- ============================================
CREATE OR REPLACE FUNCTION process_transaction(
  p_total INTEGER,
  p_bayar INTEGER,
  p_items JSONB  -- [{produk_id, nama_snapshot, harga, qty, resep: [{bahan_id, qty}]}]
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaksi_id UUID;
  v_item JSONB;
  v_resep JSONB;
  v_kembalian INTEGER;
BEGIN
  v_kembalian := p_bayar - p_total;

  INSERT INTO transaksi (total, bayar, kembalian)
  VALUES (p_total, p_bayar, v_kembalian)
  RETURNING id INTO v_transaksi_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO transaksi_item (transaksi_id, produk_id, nama_snapshot, harga, qty)
    VALUES (
      v_transaksi_id,
      (v_item->>'produk_id')::UUID,
      v_item->>'nama_snapshot',
      (v_item->>'harga')::INTEGER,
      (v_item->>'qty')::INTEGER
    );

    FOR v_resep IN SELECT * FROM jsonb_array_elements(v_item->'resep')
    LOOP
      UPDATE bahan_baku
      SET stok = stok - (v_resep->>'qty')::NUMERIC * (v_item->>'qty')::INTEGER
      WHERE id = (v_resep->>'bahan_id')::UUID;

      INSERT INTO stok_log (bahan_id, tipe, qty, referensi)
      VALUES (
        (v_resep->>'bahan_id')::UUID,
        'deduct',
        -((v_resep->>'qty')::NUMERIC * (v_item->>'qty')::INTEGER),
        v_transaksi_id::TEXT
      );
    END LOOP;
  END LOOP;

  RETURN v_transaksi_id;
END;
$$;

-- ============================================
-- Seed Data: Bahan Baku
-- ============================================
INSERT INTO bahan_baku (nama, kategori, sat_beli, isi_per_pak, sat_dasar, stok, reorder_point, harga_beli) VALUES
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
('Saus Sambal', 'Tepung & Bumbu', 'botol', 500, 'ml', 2000, 500, 18000);

-- ============================================
-- Seed Data: Produk
-- ============================================
INSERT INTO produk (nama, kategori, harga) VALUES
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
('Es Jeruk', 'Minuman', 6000);

-- ============================================
-- Seed Data: Resep (BOM)
-- ============================================
-- Ayam Goreng Dada: 1 potong dada + 50g terigu + 200ml minyak
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong'
FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Dada' AND b.nama = 'Ayam Kampung';

INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram'
FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Dada' AND b.nama = 'Terigu Segitiga Biru';

INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml'
FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Dada' AND b.nama = 'Minyak Goreng';

-- Ayam Goreng Sayap
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Sayap' AND b.nama = 'Ayam Kampung';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Sayap' AND b.nama = 'Terigu Segitiga Biru';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Sayap' AND b.nama = 'Minyak Goreng';

-- Ayam Goreng Paha Atas
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Paha Atas' AND b.nama = 'Ayam Kampung';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Paha Atas' AND b.nama = 'Terigu Segitiga Biru';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Paha Atas' AND b.nama = 'Minyak Goreng';

-- Ayam Goreng Paha Bawah
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Paha Bawah' AND b.nama = 'Ayam Kampung';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Paha Bawah' AND b.nama = 'Terigu Segitiga Biru';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b WHERE p.nama = 'Ayam Goreng Paha Bawah' AND b.nama = 'Minyak Goreng';

-- Geprek Dada: same as goreng + cabai
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Dada' AND b.nama = 'Ayam Kampung';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Dada' AND b.nama = 'Terigu Segitiga Biru';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Dada' AND b.nama = 'Minyak Goreng';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 20, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Dada' AND b.nama = 'Cabai Rawit';

-- Geprek Sayap
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Sayap' AND b.nama = 'Ayam Kampung';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Sayap' AND b.nama = 'Terigu Segitiga Biru';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Sayap' AND b.nama = 'Minyak Goreng';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 20, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Sayap' AND b.nama = 'Cabai Rawit';

-- Geprek Paha Atas
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Paha Atas' AND b.nama = 'Ayam Kampung';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Paha Atas' AND b.nama = 'Terigu Segitiga Biru';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Paha Atas' AND b.nama = 'Minyak Goreng';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 20, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Paha Atas' AND b.nama = 'Cabai Rawit';

-- Geprek Paha Bawah
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Paha Bawah' AND b.nama = 'Ayam Kampung';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Paha Bawah' AND b.nama = 'Terigu Segitiga Biru';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Paha Bawah' AND b.nama = 'Minyak Goreng';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 20, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Geprek Paha Bawah' AND b.nama = 'Cabai Rawit';

-- Paket Komplit A: 1 dada + nasi + es teh + kemasan box
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Ayam Kampung';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Terigu Segitiga Biru';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Minyak Goreng';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Beras';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'sachet' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Teh Celup';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 100, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Es Batu';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'pcs' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit A' AND b.nama = 'Kemasan Box';

-- Paket Komplit B: 1 sayap + nasi + es teh + kemasan mika
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'potong' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Ayam Kampung';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 50, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Terigu Segitiga Biru';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'ml' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Minyak Goreng';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Beras';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'sachet' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Teh Celup';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 100, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Es Batu';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'pcs' FROM produk p, bahan_baku b WHERE p.nama = 'Paket Komplit B' AND b.nama = 'Kemasan Mika';

-- Nasi Putih
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 200, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Nasi Putih' AND b.nama = 'Beras';

-- Es Teh
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 1, 'sachet' FROM produk p, bahan_baku b WHERE p.nama = 'Es Teh' AND b.nama = 'Teh Celup';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 30, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Es Teh' AND b.nama = 'Gula Pasir';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 100, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Es Teh' AND b.nama = 'Es Batu';

-- Es Jeruk
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 40, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Es Jeruk' AND b.nama = 'Gula Pasir';
INSERT INTO resep (produk_id, bahan_id, qty, sat)
SELECT p.id, b.id, 100, 'gram' FROM produk p, bahan_baku b WHERE p.nama = 'Es Jeruk' AND b.nama = 'Es Batu';
