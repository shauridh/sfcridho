-- ============================================
-- Migration 027: Public settings whitelist
-- ============================================
-- Halaman /order bersifat publik (tanpa login) tapi memakai anon key.
-- getSettings() lama mengembalikan SELURUH tabel settings termasuk
-- wa_api_key. RPC ini hanya mengembalikan key yang aman untuk publik.

CREATE OR REPLACE FUNCTION get_public_settings()
RETURNS TABLE(key TEXT, value TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.key, s.value
  FROM settings s
  WHERE s.key IN ('store_name', 'ongkir', 'online_delivery');
$$;

GRANT EXECUTE ON FUNCTION get_public_settings() TO anon, authenticated;
