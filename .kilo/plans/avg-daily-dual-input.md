# Plan: Avg/Hari — Input dalam 2 Satuan (Beli atau Dasar)

## Context
User ingin input avg_daily bisa pakai satuan beli (misal "pak") atau satuan dasar (misal "potong"), dan keduanya saling sinkron.

## Perubahan: src/components/stok/StokForm.tsx

### State
- Hapus: `avgDaily` (single state)
- Tambah: `avgDailyBeli` + `avgDailyDasar` (dual state, saling sinkron)

### UI
- Dual input: 2 kolom — "Per {satBeli}" dan "Per {satDasar}"
- Ubah satu → otomatis hitung yang lain via `isi_per_pak`
- Submit tetap simpan `avgDailyDasar` (sat_dasar) ke DB

### Tidak berubah
- useStok.ts, StokTable.tsx, ForecastBanner.tsx — semua tetap sama
- Forecast tetap pakai avg_daily dalam sat_dasar
