-- ============================================
-- Sabana FC POS â€” Supabase Schema
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

