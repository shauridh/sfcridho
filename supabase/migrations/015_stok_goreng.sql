-- Migration 015: stok_goreng untuk batch frying
ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS stok_goreng NUMERIC DEFAULT 0;
