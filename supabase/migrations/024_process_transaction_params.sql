-- Update RPC process_transaction untuk menerima shift_id, user_id, metode_bayar
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
BEGIN
  v_kembalian := p_bayar - p_total;

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

-- Perbaiki schema transaksi jika kolom belum ada
ALTER TABLE transaksi 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shift(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS metode_bayar TEXT DEFAULT 'tunai';

-- Index untuk query shift
CREATE INDEX IF NOT EXISTS idx_transaksi_shift ON transaksi(shift_id);