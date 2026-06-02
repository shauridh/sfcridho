-- Migration 007: Tambah bunga di piutang
ALTER TABLE piutang ADD COLUMN IF NOT EXISTS bunga NUMERIC(5,2) DEFAULT 0;
