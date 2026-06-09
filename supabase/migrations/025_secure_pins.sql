-- ============================================
-- Migration 025: Hash PINs & lock down app_users
-- ============================================
-- Tujuan:
--  1. Hash semua PIN dengan bcrypt (pgcrypto), bukan plaintext.
--  2. verify_login membandingkan hash, bukan string mentah.
--  3. Cegah kolom pin_hash dibaca/ditulis langsung oleh client (anon key).
--  4. Semua tulis ke app_users lewat RPC SECURITY DEFINER yang melakukan hashing.
--
-- AMAN dijalankan ulang (idempotent).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pgcrypto di Supabase berada di schema "extensions". Sertakan di search_path
-- agar crypt()/gen_salt() bisa ditemukan baik di statement ini maupun di RPC.
SET search_path = public, extensions;

-- ---------------------------------------------------------------
-- 1. Migrasi PIN lama (plaintext) -> bcrypt.
--    Hash bcrypt selalu diawali "$2", jadi baris yang belum di-hash
--    akan di-hash sekali. Idempotent.
-- ---------------------------------------------------------------
UPDATE app_users
SET pin_hash = crypt(pin_hash, gen_salt('bf'))
WHERE pin_hash IS NOT NULL
  AND pin_hash NOT LIKE '$2%';

-- ---------------------------------------------------------------
-- 2. verify_login: bandingkan PIN dengan hash bcrypt.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION verify_login(p_username TEXT, p_pin TEXT)
RETURNS TABLE(id UUID, username TEXT, nama TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username, u.nama, u.role
  FROM app_users u
  WHERE u.username = p_username
    AND u.aktif = true
    AND u.pin_hash = crypt(p_pin, u.pin_hash);
END;
$$;

-- ---------------------------------------------------------------
-- 3. RPC untuk manajemen user (hashing dilakukan server-side).
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_create_user(
  p_username TEXT,
  p_pin TEXT,
  p_nama TEXT,
  p_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_role NOT IN ('owner', 'kasir') THEN
    RAISE EXCEPTION 'Role tidak valid';
  END IF;
  IF length(p_pin) < 4 THEN
    RAISE EXCEPTION 'PIN minimal 4 digit';
  END IF;

  INSERT INTO app_users (username, pin_hash, nama, role)
  VALUES (p_username, crypt(p_pin, gen_salt('bf')), p_nama, p_role)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION app_update_user(
  p_id UUID,
  p_username TEXT,
  p_nama TEXT,
  p_role TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_role NOT IN ('owner', 'kasir') THEN
    RAISE EXCEPTION 'Role tidak valid';
  END IF;

  UPDATE app_users
  SET username = p_username,
      nama = p_nama,
      role = p_role
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION app_set_pin(p_id UUID, p_pin TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF length(p_pin) < 4 THEN
    RAISE EXCEPTION 'PIN minimal 4 digit';
  END IF;

  UPDATE app_users
  SET pin_hash = crypt(p_pin, gen_salt('bf'))
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION app_set_user_aktif(p_id UUID, p_aktif BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE app_users SET aktif = p_aktif WHERE id = p_id;
END;
$$;

-- Verifikasi PIN owner (untuk aksi sensitif di kasir, mis. void/hapus).
-- Tidak bergantung pada username "admin" tertentu.
CREATE OR REPLACE FUNCTION verify_owner_pin(p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_users u
    WHERE u.role = 'owner'
      AND u.aktif = true
      AND u.pin_hash = crypt(p_pin, u.pin_hash)
  );
END;
$$;

-- ---------------------------------------------------------------
-- 4. Kunci akses langsung ke app_users.
--    - Cabut semua privilege dari anon/authenticated.
--    - Beri SELECT hanya pada kolom non-sensitif (tanpa pin_hash).
--    - Semua tulis hanya lewat RPC di atas.
-- ---------------------------------------------------------------
REVOKE ALL PRIVILEGES ON app_users FROM anon, authenticated;
GRANT SELECT (id, username, nama, role, aktif, created_at)
  ON app_users TO anon, authenticated;

GRANT EXECUTE ON FUNCTION verify_login(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_create_user(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_update_user(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_set_pin(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION app_set_user_aktif(UUID, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_owner_pin(TEXT) TO anon, authenticated;
