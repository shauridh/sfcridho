-- ============================================
-- Migration 026: Data integrity untuk transaksi
-- ============================================
-- Tujuan:
--  1. Hapus overload lama process_transaction(3 param) agar tidak ambigu.
--  2. Validasi stok cukup sebelum deduct (cegah stok minus).
--  3. Cegah stok bahan_baku jadi negatif via CHECK constraint.

-- ---------------------------------------------------------------
-- 1. Drop overload lama (3 param) jika masih ada.
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS process_transaction(INTEGER, INTEGER, JSONB);

-- ---------------------------------------------------------------
-- 2. Cegah stok negatif di level data.
--    Hanya tambahkan constraint jika belum ada & data saat ini valid.
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bahan_baku_stok_nonneg'
  ) AND NOT EXISTS (
    SELECT 1 FROM bahan_baku WHERE stok < 0
  ) THEN
    ALTER TABLE bahan_baku ADD CONSTRAINT bahan_baku_stok_nonneg CHECK (stok >= 0);
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 3. process_transaction dengan validasi stok.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_transaction(
  p_total INTEGER,
  p_bayar INTEGER,
  p_items JSONB,
  p_shift_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_metode_bayar TEXT DEFAULT 'tunai'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaksi_id UUID;
  v_item JSONB;
  v_resep JSONB;
  v_kembalian INTEGER;
  v_bahan_id UUID;
  v_qty_needed NUMERIC;
  v_stok_now NUMERIC;
  v_bahan_nama TEXT;
BEGIN
  v_kembalian := p_bayar - p_total;

  -- Validasi stok cukup untuk seluruh item (sebelum menulis apa pun).
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    FOR v_resep IN SELECT * FROM jsonb_array_elements(v_item->'resep')
    LOOP
      v_bahan_id := (v_resep->>'bahan_id')::UUID;
      v_qty_needed := (v_resep->>'qty')::NUMERIC * (v_item->>'qty')::INTEGER;

      SELECT stok, nama INTO v_stok_now, v_bahan_nama
      FROM bahan_baku WHERE id = v_bahan_id FOR UPDATE;

      IF v_stok_now IS NULL THEN
        RAISE EXCEPTION 'Bahan baku % tidak ditemukan', v_bahan_id;
      END IF;

      IF v_stok_now < v_qty_needed THEN
        RAISE EXCEPTION 'Stok % tidak cukup (butuh %, tersedia %)',
          v_bahan_nama, v_qty_needed, v_stok_now;
      END IF;
    END LOOP;
  END LOOP;

  INSERT INTO transaksi (total, bayar, kembalian, shift_id, user_id, metode_bayar)
  VALUES (p_total, p_bayar, v_kembalian, p_shift_id, p_user_id, p_metode_bayar)
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
      v_bahan_id := (v_resep->>'bahan_id')::UUID;
      v_qty_needed := (v_resep->>'qty')::NUMERIC * (v_item->>'qty')::INTEGER;

      UPDATE bahan_baku
      SET stok = stok - v_qty_needed
      WHERE id = v_bahan_id;

      INSERT INTO stok_log (bahan_id, tipe, qty, referensi)
      VALUES (v_bahan_id, 'deduct', -v_qty_needed, v_transaksi_id::TEXT);
    END LOOP;
  END LOOP;

  RETURN v_transaksi_id;
END;
$$;

GRANT EXECUTE ON FUNCTION process_transaction(INTEGER, INTEGER, JSONB, UUID, UUID, TEXT)
  TO anon, authenticated;
