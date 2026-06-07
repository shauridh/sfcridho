-- Migration 012: avg_daily manual field on bahan_baku
ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS avg_daily NUMERIC DEFAULT 0;
