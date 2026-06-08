-- Migration 019: Add available_items to orders for kasir kurasi
ALTER TABLE orders ADD COLUMN IF NOT EXISTS available_items JSONB;
