-- Migration 022: Add has_addons toggle to produk
ALTER TABLE produk ADD COLUMN IF NOT EXISTS has_addons BOOLEAN DEFAULT false;
