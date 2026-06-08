-- Migration 020: Add subtotal and ongkir to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ongkir INTEGER DEFAULT 0;
