# Plan: Resep Goreng — Auto-Deduct Tepung & Minyak Saat Goreng Ayam

## Context
Saat goreng ayam, selain ayam itu sendiri, ada 2 bahan lain yang terkonsumsi:
- **Tepung**: 3 pak ayam → 1 kg tepung (0.333 kg/pak)
- **Minyak**: 10 pak ayam → 1 pouch 2L (0.2 liter/pak)

Saat ini sistem hanya memindahkan ayam dari `stok` → `stok_goreng` (1:1), tanpa memperhitungkan bahan lain.

## Solusi: `resep_goreng` JSONB field pada `bahan_baku`

Setiap bahan baku bisa punya **resep goreng** — daftar bahan lain yang terkonsumsi saat diproses.

### Format Data
```json
// Pada bahan_baku "Ayam" → resep_goreng:
[
  { "bahan_id": "uuid-tepung", "qty_per_kantong": 0.333 },
  { "bahan_id": "uuid-minyak", "qty_per_kantong": 0.2 }
]
```

- `qty_per_kantong` = berapa `sat_dasar` bahan terkait yang dipakai per 1 `sat_beli` (kantong/pak) bahan utama
- Saat goreng 3 pak ayam: tepung = 3 × 0.333 = 1 kg, minyak = 3 × 0.2 = 0.6 liter

---

## Perubahan File

### 1. Migration SQL
**File baru:** `supabase/migrations/016_resep_goreng.sql`

```sql
ALTER TABLE bahan_baku ADD COLUMN IF NOT EXISTS resep_goreng JSONB DEFAULT '[]';
```

### 2. Types
**File:** `src/lib/types.ts`

Tambah field `resep_goreng` ke `BahanBaku` interface:
```typescript
resep_goreng: { bahan_id: string; qty_per_kantong: number }[];
```

### 3. useStok.ts — goreng function
**File:** `src/hooks/useStok.ts`

Ubah function `goreng` untuk:
1. Baca `resep_goreng` dari bahan yang digoreng
2. Hitung kebutuhan setiap bahan terkait: `jumlahKantong × qty_per_kantong`
3. Validasi stok semua bahan cukup sebelum proses
4. Deduct stok bahan terkait dari DB
5. Log setiap deduct ke `stok_log`

```typescript
// Pseudocode:
const goreng = async (id, jumlahKantong) => {
  const bahan = bahanBaku.find(b => b.id === id);
  const potongHasil = jumlahKantong * bahan.isi_per_pak;
  
  // Validasi stok utama
  if (bahan.stok < potongHasil) return error;
  
  // Validasi stok bahan resep
  for (const item of bahan.resep_goreng) {
    const bahanTerkait = bahanBaku.find(b => b.id === item.bahan_id);
    const dibutuhkan = jumlahKantong * item.qty_per_kantong;
    if (bahanTerkait.stok < dibutuhkan) return error;
  }
  
  // Deduct stok utama (ayam mentah → goreng)
  await supabase.from("bahan_baku").update({ 
    stok: bahan.stok - potongHasil,
    stok_goreng: (bahan.stok_goreng || 0) + potongHasil 
  }).eq("id", id);
  
  // Deduct stok bahan resep
  for (const item of bahan.resep_goreng) {
    const bahanTerkait = bahanBaku.find(b => b.id === item.bahan_id);
    const dibutuhkan = jumlahKantong * item.qty_per_kantong;
    await supabase.from("bahan_baku").update({
      stok: bahanTerkait.stok - dibutuhkan
    }).eq("id", item.bahan_id);
    // Log
    await supabase.from("stok_log").insert({ ... });
  }
};
```

### 4. GorengModal.tsx — Preview Konsumsi
**File:** `src/components/stok/GorengModal.tsx`

Ubah preview panel untuk menampilkan:
- Bahan utama: ayam mentah → goreng (seperti sekarang)
- **Tambah:** daftar bahan resep yang terkonsumsi + stok saat ini
- Warning jika stok bahan resep tidak cukup

Props perlu ditambah: `allBahan: BahanBaku[]` (untuk resolve nama & stok bahan resep)

Preview contoh:
```
┌─ Preview Goreng ─────────────────────┐
│ 🍗 Ayam mentah: −6 potong            │
│ 🍗 Ayam goreng: +6 potong            │
│                                      │
│ Bahan lain yang terpakai:            │
│ ⚠️ Tepung: −1 kg (sisa: 2 kg)       │
│ ⚠️ Minyak: −0.6 liter (sisa: 1.4 L) │
└──────────────────────────────────────┘
```

### 5. StokForm.tsx — UI Konfigurasi Resep Goreng
**File:** `src/components/stok/StokForm.tsx`

Tambah section "Resep Goreng" (hanya muncul saat edit, bukan tambah baru):
- Daftar bahan resep yang sudah ada (bisa dihapus)
- Dropdown pilih bahan + input qty_per_kantong
- Tombol "+ Tambah Bahan"
- Konversi ditampilkan: "1 kantong [nama_bahan_utama] → [qty] [sat_dasar_bahan_terkait]"

Props perlu ditambah: `allBahan: BahanBaku[]` (untuk dropdown pilih bahan)

UI contoh:
```
┌─ Resep Goreng (opsional) ──────────────────┐
│ Bahan lain yang terpakai saat goreng batch  │
│                                             │
│ [Tepung ▼]  0.333 kg per pak  [×]          │
│ [Minyak ▼]  0.2   L per pak   [×]          │
│                                             │
│ [+ Tambah Bahan]                            │
│                                             │
│ ℹ️ 1 pak ayam → 0.333 kg tepung + 0.2 L   │
│   minyak                                    │
└─────────────────────────────────────────────┘
```

### 6. stok/page.tsx — Pass allBahan ke Modal
**File:** `src/app/stok/page.tsx`

Pass `bahanBaku` ke `GorengModal` dan `StokForm` sebagai prop `allBahan`.

---

## File yang Diubah

| # | File | Perubahan |
|---|------|-----------|
| 1 | `supabase/migrations/016_resep_goreng.sql` | **Baru** — tambah kolom `resep_goreng` |
| 2 | `src/lib/types.ts` | Tambah `resep_goreng` ke `BahanBaku` |
| 3 | `src/hooks/useStok.ts` | Update `goreng()` — auto-deduct bahan resep |
| 4 | `src/components/stok/GorengModal.tsx` | Tambah preview bahan resep + validasi stok |
| 5 | `src/components/stok/StokForm.tsx` | Tambah UI config resep goreng |
| 6 | `src/app/stok/page.tsx` | Pass `allBahan` ke GorengModal & StokForm |

## Data Awal (User Input Setelah Deploy)

1. **Tambah bahan "Tepung"**: nama=Tepung, kategori=Bumbu/Pelengkap, sat_beli=kg, sat_dasar=kg, isi_per_pak=1
2. **Tambah bahan "Minyak Goreng"**: nama=Minyak Goreng, kategori=Bumbu/Pelengkap, sat_beli=pouch, sat_dasar=liter, isi_per_pak=2
3. **Edit bahan "Ayam"** → section Resep Goreng → tambah:
   - Tepung: 0.333 kg per kantong
   - Minyak: 0.2 liter per kantong

## Urutan Eksekusi
1. Migration SQL
2. Types update
3. useStok.ts — goreng function
4. GorengModal — preview
5. StokForm — config UI
6. stok/page.tsx — pass props
7. `tsc --noEmit` verify
8. Commit & push
