-- Migration 018: Add location_url to orders for GPS tagging
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_url TEXT;
