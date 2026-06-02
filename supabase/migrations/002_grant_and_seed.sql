-- ============================================
-- GRANT table permissions to anon & authenticated roles
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON bahan_baku TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON produk TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON resep TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transaksi TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transaksi_item TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stok_log TO anon, authenticated;

-- Sequence permissions
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- ============================================
-- GRANT EXECUTE on process_transaction RPC
-- ============================================
GRANT EXECUTE ON FUNCTION process_transaction(INTEGER, INTEGER, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION process_transaction(INTEGER, INTEGER, JSONB) TO authenticated;
