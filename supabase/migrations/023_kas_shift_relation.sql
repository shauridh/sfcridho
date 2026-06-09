-- Tambah relasi ke shift dan perbaiki audit trail
ALTER TABLE kas 
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shift(id) ON DELETE SET NULL;

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_kas_shift_id ON kas(shift_id);
CREATE INDEX IF NOT EXISTS idx_kas_waktu ON kas(waktu DESC);

-- Update kas entries yang sudah ada dari shift yang closed
-- Catatan: Omset yang sudah di-insert sebelumnya akan dipertahankan
-- tapi gunakan shift_id untuk tracking

-- Tambah kolom untuk tracking sumber transaksi (opsional)
-- ALTER TABLE kas ADD COLUMN IF NOT EXISTS referensi_tipe TEXT CHECK (referensi_tipe IN ('transaksi', 'opex', 'piutang'));