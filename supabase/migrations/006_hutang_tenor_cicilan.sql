-- Migration 006: Tambah tenor & cicilan di piutang
ALTER TABLE piutang ADD COLUMN IF NOT EXISTS tenor INTEGER;
ALTER TABLE piutang ADD COLUMN IF NOT EXISTS cicilan INTEGER;
