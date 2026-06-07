-- Migration 014: Admin PIN setting
INSERT INTO settings (key, value) VALUES (''admin_pin'', ''271222'')
ON CONFLICT (key) DO NOTHING;
