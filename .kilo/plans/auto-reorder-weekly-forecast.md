# Plan: Auto Reorder Point + Weekly Order Forecast

## Context
User ingin:
1. **Reorder point otomatis** — Hitung rekomendasi berdasarkan avg_daily
2. **Estimasi order mingguan** — Tampilkan kapan harus order, bahan apa, berapa jumlahnya untuk 1 minggu

---

## 1. Auto Reorder Point

### Formula
```
reorder_point = avg_daily × safety_days
```
- `safety_days` = pengaturan global (default 3 hari)
- Artinya: stok harus diisi ulang sebelum sisa 3 hari

### Cara Hitung
- Jika `avg_daily = 22.5 potong/hari` dan `safety_days = 3`
- Maka `reorder_point = 22.5 × 3 = 67.5 → dibulatkan ke 68 potong`
- Dalam sat_beli: `68 / 9 = 7.56 → 8 pak`

### UI yang Ditambahkan

#### A. Di ForecastBanner (atas halaman Stok)
Tambah tombol "Terapkan Rekomendasi" yang auto-fill reorder_point untuk semua bahan yang punya avg_daily > 0.

```
┌─ Rekomendasi Reorder Point ──────────────────┐
│ ⚡ 5 bahan perlu reorder point                │
│                                               │
│ 🍗 Ayam: 8 pak (68 potong)                   │
│ 📦 Tepung: 3 kg                              │
│ 🛢️ Minyak: 1 liter                           │
│                                               │
│ [Terapkan Semua] [Lihat Detail]              │
└───────────────────────────────────────────────┘
```

#### B. Di StokForm (form tambah/edit bahan)
Tambah info rekomendasi di bawah input Reorder Point:
```
Reorder Pt (pak): [8]
💡 Rekomendasi: 8 pak (berdasarkan avg 2.5 pak/hari × 3 hari)
   [Gunakan]
```

### Perubahan File
| File | Perubahan |
|------|-----------|
| `src/app/stok/page.tsx` | Tambah section rekomendasi reorder point di atas ForecastBanner |
| `src/components/stok/StokForm.tsx` | Tampilkan rekomendasi di bawah input reorder_point |
| `src/hooks/useStok.ts` | Tambah function `applyReorderPoints()` — update semua reorder_point sekaligus |

### Settings
Tambah `safety_days` di settings table (default: 3). Bisa diubah di Pengaturan → Toko.

---

## 2. Weekly Order Forecast

### Data yang Ditampilkan
Untuk setiap bahan yang punya `avg_daily > 0`:

| Kolom | Penjelasan |
|-------|------------|
| Bahan | Nama bahan |
| Stok | Stok saat ini (dalam sat_beli) |
|/Hari | Konsumsi per hari (dalam sat_beli) |
| Sisa Hari | `stok / avg_daily` |
| Tanggal Order | Hari ini + (sisa_hari - safety_days). Jika sudah < safety_days → "SEKARANG" |
| Jumlah Order | `reorderQty` dalam sat_beli (untuk cover 7 hari) |
| Est. Harga | `jumlah_order × harga_beli` (jika harga_beli tersedia) |

### Contoh Output
```
┌─ Estimasi Order Mingguan ──────────────────────────────────┐
│ 📅 Periode: 8 Jun — 15 Jun 2026                          │
│                                                            │
│ Bahan        Stok  /Hari  Sisa  Order By    Jumlah   Harga│
│ Ayam         27 pak 2.5   11h   11 Jun      8 pak   440rb │
│ Tepung       5 kg   1.3   4h    ⚠️ SEKARANG  9 kg    135rb │
│ Minyak       3 L    0.7   4h    ⚠️ SEKARANG  5 L     75rb  │
│                                                            │
│ ────────────────────────────────────────────────           │
│ Total Estimasi: Rp 650.000                                │
│                                                            │
│ ℹ️ Berdasarkan avg_daily × 7 hari + safety 3 hari         │
└────────────────────────────────────────────────────────────┘
```

### UI Location
Tambah sebagai collapsible section di halaman Stok, di bawah "Goreng Hari Ini" dan di atas daftar bahan baku. Default: collapsed. Klik untuk expand.

### Perubahan File
| File | Perubahan |
|------|-----------|
| `src/app/stok/page.tsx` | Tambah section "Estimasi Order Mingguan" (collapsible) |
| `src/hooks/useStok.ts` | Tambah function `getWeeklyForecast()` — return data untuk tabel |

### Formula Detail
```ts
function getWeeklyForecast() {
  return bahanBaku
    .filter(b => b.avg_daily > 0)
    .map(b => {
      const avgDailyBeli = b.avg_daily / b.isi_per_pak;  // dalam sat_beli
      const stokBeli = b.stok / b.isi_per_pak;
      const daysRemaining = Math.floor(b.stok / b.avg_daily);
      const safetyDays = parseInt(settings.safety_days) || 3;
      const orderByDate = new Date();
      orderByDate.setDate(orderByDate.getDate() + Math.max(0, daysRemaining - safetyDays));
      
      const stokNeeded7d = Math.ceil(b.avg_daily * 7);  // dalam sat_dasar
      const reorderQty = Math.max(0, stokNeeded7d - b.stok);
      const reorderQtyBeli = Math.ceil(reorderQty / b.isi_per_pak);
      const estHarga = reorderQtyBeli * b.harga_beli;
      
      return {
        ...b,
        stokBeli: Math.floor(stokBeli),
        avgDailyBeli,
        daysRemaining,
        orderByDate,
        reorderQtyBeli,
        estHarga,
        isUrgent: daysRemaining <= safetyDays,
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
```

---

## File yang Diubah (Semua)

| # | File | Perubahan |
|---|------|-----------|
| 1 | `src/hooks/useStok.ts` | Tambah `getWeeklyForecast()`, `applyReorderPoints()` |
| 2 | `src/app/stok/page.tsx` | Tambah section rekomendasi reorder + estimasi order mingguan |
| 3 | `src/components/stok/StokForm.tsx` | Tampilkan rekomendasi reorder_point |
| 4 | `src/app/pengaturan/page.tsx` | Tambah input `safety_days` di tab Toko |

## Urutan Eksekusi
1. `useStok.ts` — tambah `getWeeklyForecast()` dan `applyReorderPoints()`
2. `stok/page.tsx` — tambah 2 section baru
3. `StokForm.tsx` — tambah rekomendasi di input reorder_point
4. `pengaturan/page.tsx` — tambah `safety_days` setting
5. `tsc --noEmit` verify
6. Commit & push
