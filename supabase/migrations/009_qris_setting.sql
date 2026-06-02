-- Migration 009: Add QRIS static string setting
INSERT INTO settings (key, value) VALUES ('qris_string', '')
ON CONFLICT (key) DO NOTHING;
