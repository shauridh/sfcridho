-- Migration 013: Orders table for online delivery
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  phone TEXT NOT NULL,
  alamat TEXT,
  items JSONB NOT NULL,
  catatan TEXT,
  total INTEGER NOT NULL,
  status TEXT DEFAULT ''pending'' CHECK (status IN (''pending'', ''confirmed'', ''paid'', ''done'', ''cancelled'')),
  qris_string TEXT,
  confirm_token TEXT UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_orders" ON orders;
CREATE POLICY "allow_all_orders" ON orders FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_token ON orders(confirm_token);
