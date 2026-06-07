-- Migration 010: Fix cascade constraints for delete
-- stok_log: CASCADE on bahan_baku delete
ALTER TABLE stok_log DROP CONSTRAINT IF EXISTS stok_log_bahan_id_fkey;
ALTER TABLE stok_log ADD CONSTRAINT stok_log_bahan_id_fkey
  FOREIGN KEY (bahan_id) REFERENCES bahan_baku(id) ON DELETE CASCADE;

-- transaksi_item: SET NULL on produk delete (preserve transaction history)
ALTER TABLE transaksi_item DROP CONSTRAINT IF EXISTS transaksi_item_produk_id_fkey;
ALTER TABLE transaksi_item ADD CONSTRAINT transaksi_item_produk_id_fkey
  FOREIGN KEY (produk_id) REFERENCES produk(id) ON DELETE SET NULL;
