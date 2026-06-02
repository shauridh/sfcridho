-- ============================================
-- Migration 004: Auth, Settings, QRIS, Kategori
-- ============================================

-- 1. Tabel app_users (autentikasi kasir/owner)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  nama TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'kasir')),
  aktif BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_app_users" ON app_users;
CREATE POLICY "allow_all_app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);

-- 2. Tabel settings (konfigurasi umum)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_settings" ON settings;
CREATE POLICY "allow_all_settings" ON settings FOR ALL USING (true) WITH CHECK (true);

-- Seed settings default
INSERT INTO settings (key, value) VALUES
  ('store_name', 'Sabana Fried Chicken'),
  ('wa_api_key', ''),
  ('wa_phone', ''),
  ('wa_auto_send', 'false'),
  ('daily_target', '1500000')
ON CONFLICT (key) DO NOTHING;

-- 3. Tabel kategori_order (urutan kategori kasir)
CREATE TABLE IF NOT EXISTS kategori_order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT UNIQUE NOT NULL,
  urutan INTEGER NOT NULL
);

ALTER TABLE kategori_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE kategori_order FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_kategori_order" ON kategori_order;
CREATE POLICY "allow_all_kategori_order" ON kategori_order FOR ALL USING (true) WITH CHECK (true);

-- Seed kategori order
INSERT INTO kategori_order (nama, urutan) VALUES
  ('Ayam', 1),
  ('Geprek', 2),
  ('Paket', 3),
  ('Minuman', 4),
  ('Tambahan', 5)
ON CONFLICT (nama) DO NOTHING;

-- 4. Tambah kolom metode_bayar di transaksi
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS metode_bayar TEXT DEFAULT 'tunai' CHECK (metode_bayar IN ('tunai', 'qris'));

-- 5. Tambah kolom user_id di transaksi dan shift
ALTER TABLE transaksi ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id);
ALTER TABLE shift ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id);

-- 6. Verify function for login
CREATE OR REPLACE FUNCTION verify_login(p_username TEXT, p_pin TEXT)
RETURNS TABLE(id UUID, username TEXT, nama TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.nama, u.role
  FROM app_users u
  WHERE u.username = p_username
    AND u.pin_hash = p_pin
    AND u.aktif = true;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_login(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_login(TEXT, TEXT) TO authenticated;

-- 7. Seed default owner (PIN: 1234)
INSERT INTO app_users (username, pin_hash, nama, role) VALUES
  ('admin', '1234', 'Administrator', 'owner'),
  ('kasir1', '1234', 'Kasir 1', 'kasir')
ON CONFLICT (username) DO NOTHING;
