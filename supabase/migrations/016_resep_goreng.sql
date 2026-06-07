-- Migration 016: resep_goreng untuk auto-deduct bahan terkait saat goreng batch
ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS resep_goreng JSONB DEFAULT '[]';
