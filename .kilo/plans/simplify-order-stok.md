# Plan: Simplifikasi Stok + Order Flow Improvement

## Context
5 perubahan yang diminta user:
1. **Sistem stok sederhana** — Hapus resep_goreng complex, ganti dengan "Input Goreng Harian"
2. **Hapus notif dobel** — Customer tidak dapat WA saat submit order, kasir dapat popup
3. **Menu collapse/expand** — Menu di form order dikelompokkan per kategori (collapsible)
4. **Checkbox kurasi kasir** — Kasir bisa centang mana yang ada/habis per item pesanan
5. **Kirim gambar QRIS** — Kirim QR code sebagai gambar ke customer via WA

---

## 1. Simplifikasi Stok — "Goreng Harian"

### Hapus
- UI resep_goreng di `StokForm.tsx` (section "Resep Goreng" yang complex)
- Props `allBahan` dari `StokForm` dan `GorengModal`

### Tambah: "Goreng Harian" di stok page
Ganti tombol "Goreng" per-item dengan section baru di atas tabel stok:

```
┌─ Goreng Hari Ini ────────────────────────────────┐
│ Berapa kali goreng batch hari ini? [4]           │
│                                                  │
│ Akan terpotong otomatis:                         │
│ 🍗 Ayam: −12 potong (4 × 3 pak × 9 potong)    │
│ 📦 Tepung: −4 kg (4 × 1 kg)                    │
│ 🛢️ Minyak: −2 liter (per hari)                 │
│                                                  │
│ [Proses Goreng Hari Ini]                         │
└──────────────────────────────────────────────────┘
```

### Hardcode ratio
```ts
const GORENG_RATIO = {
  ayam_pak: 3,      // 3 pak ayam per batch
  tepung_kg: 1,     // 1 kg tepung per batch
  minyak_liter: 2,  // 2 liter per hari (tetap, bukan per batch)
};
```

### Logic
1. User input "berapa kali goreng" (misal 4)
2. Cari bahan_baku yang match:
   - Ayam: cari kategori "Ayam" → kurangi `stok` (mentah), tambah `stok_goreng`
   - Tepung: cari nama mengandung "tepung" → kurangi `stok`
   - Minyak: cari nama mengandung "minyak" → kurangi `stok` (2L flat per hari)
3. Validasi semua stok cukup sebelum proses
4. Log ke stok_log

### Perubahan File
| File | Perubahan |
|------|-----------|
| `src/app/stok/page.tsx` | Tambah section "Goreng Harian", hapus GorengModal per-item |
| `src/components/stok/StokForm.tsx` | Hapus section resep_goreng + props allBahan |
| `src/components/stok/StokTable.tsx` | Hapus tombol "Goreng" per baris (diganti goreng harian) |
| `src/hooks/useStok.ts` | Tambah function `gorengHarian(jumlahBatch)` |
| `src/components/stok/GorengModal.tsx` | Hapus (tidak dipakai lagi) |

### DB
- `resep_goreng` column tetap ada (tidak dihapus), tapi tidak dipakai UI lagi
- Tidak perlu migration baru

---

## 2. Hapus Notif Dobel + Popup di Kasir

### Masalah Saat Ini
Customer dapat 2 WA: satu saat submit ("terima kasih"), satu saat kasir konfirmasi ("QRIS"). Yang pertama tidak perlu.

### Yang Diubah
**`src/app/order/page.tsx`:**
- Hapus `sendWhatsApp(customerMsg, phone)` — customer tidak dapat WA saat submit
- Tetap kirim `sendWhatsApp(ownerMsg)` — owner tetap dapat notif

**`src/components/kasir/OnlineOrders.tsx`:**
- Tambah state `showNewOrderPopup` + `newOrderData`
- Setelah fetch orders, cek apakah ada order baru (dibanding fetch sebelumnya)
- Jika ada → tampilkan popup "Pesanan Baru!" di kasir

Popup contoh:
```
┌─ 🔔 Pesanan Baru! ──────────────────┐
│ Dari: Budi (08123456789)            │
│ Total: Rp 45.000                    │
│                                      │
│ Geprek Dada x2, Es Teh x1           │
│                                      │
│ [Lihat Pesanan] [Tutup]             │
└──────────────────────────────────────┘
```

### Perubahan File
| File | Perubahan |
|------|-----------|
| `src/app/order/page.tsx` | Hapus WA ke customer saat submit |
| `src/components/kasir/OnlineOrders.tsx` | Tambah popup notif order baru |

---

## 3. Menu Collapse/Expand di Form Order

### Saat Ini
Menu ditampilkan flat list dengan filter kategori di atas.

### Yang Diubah
Menu dikelompokkan per kategori, setiap kategori bisa di-collapse/expand.

```
▼ 🍗 Ayam (3 item)
  Geprek Dada    Rp 15.000  [+]
  Geprek Paha    Rp 13.000  [+]
  Goreng Biasa   Rp 12.000  [+]

▼ 🥤 Minuman (2 item)
  Es Teh         Rp 3.000   [+]
  Es Jeruk       Rp 5.000   [+]

▶ 📦 Paket (2 item)  ← collapsed
```

Default: semua expanded. Klik header kategori → toggle collapse.

### Perubahan File
| File | Perubahan |
|------|-----------|
| `src/app/order/page.tsx` | Group menu by kategori, tambah collapse/expand toggle |

---

## 4. Checkbox Kurasi di Kasir

### Flow
Kasir terima order → sebelum konfirmasi, kasir bisa centang item mana yang tersedia dan mana yang habis. Jika ada item habis, kasir bisa konfirmasi sebagian (partial) atau tolak semua.

### UI di OnlineOrders
Untuk order `pending`, tambah checkbox per item:

```
┌─ Pesanan: Budi ─────────────────────┐
│ ✅ Geprek Dada x2    Rp 30.000     │
│ ✅ Es Teh x1         Rp 3.000      │
│ ❌ Es Jeruk x1       Rp 5.000  HABIS│
│                                      │
│ Total: Rp 33.000 (setelah kurasi)    │
│                                      │
│ [Konfirmasi & Kirim QRIS] [Tolak]   │
└──────────────────────────────────────┘
```

### Data Model
Tambah field `items_status` di order (JSONB):
```json
[
  { "nama": "Geprek Dada", "qty": 2, "harga": 15000, "subtotal": 30000, "available": true },
  { "nama": "Es Jeruk", "qty": 1, "harga": 5000, "subtotal": 5000, "available": false }
]
```

Atau lebih simpel: simpan `available_items` sebagai array index yang tersedia.

### Perubahan File
| File | Perubahan |
|------|-----------|
| `src/components/kasir/OnlineOrders.tsx` | Tambah checkbox per item, hitung total ulang |
| `src/lib/types.ts` | Tambah `available_items: number[] | null` di Order |
| `supabase/migrations/019_order_items_status.sql` | **Baru** — kolom `available_items` |

### WA Message
Saat konfirmasi, kirim ke customer:
```
Pesanan Anda dikonfirmasi!

✅ Geprek Dada x2 — Rp 30.000
✅ Es Teh x1 — Rp 3.000
❌ Es Jeruk — habis

Total: Rp 33.000
Silakan bayar via QRIS: [link]
```

---

## 5. Kirim Gambar QRIS ke Customer

### Saat Ini
Kasir klik "Konfirmasi & Kirim QRIS" → generate dynamic QRIS string → kirim WA text dengan link.

### Yang Diubah
Generate QR code sebagai gambar (base64 PNG) → kirim via WA image endpoint.

### Implementation
1. Di `OnlineOrders.tsx`, setelah generate dynamic QRIS string:
   ```ts
   const QRCodeLib = await import("qrcode");
   const qrDataUrl = await QRCodeLib.default.toDataURL(dynamicQris, { width: 400, margin: 2 });
   // qrDataUrl = "data:image/png;base64,..."
   ```
2. Kirim gambar via WA API:
   ```ts
   await sendWhatsAppImage(qrDataUrl, order.phone, caption);
   ```

3. Tambah function `sendWhatsAppImage` di `whatsapp.ts`:
   ```ts
   export async function sendWhatsAppImage(base64Image: string, to: string, caption?: string) {
     // POST ke /api/whatsapp dengan tipe "image"
   }
   ```

4. Update `/api/whatsapp/route.ts` — support `send-image` endpoint:
   ```ts
   if (type === "image") {
     // POST ke getsender.id send-image endpoint
   }
   ```

### Perubahan File
| File | Perubahan |
|------|-----------|
| `src/lib/whatsapp.ts` | Tambah `sendWhatsAppImage()` |
| `src/app/api/whatsapp/route.ts` | Support image sending |
| `src/components/kasir/OnlineOrders.tsx` | Generate QR image + kirim |

### Note
Perlu cek apakah getsender.id support endpoint `send-image`. Jika tidak, alternatif:
- Kirim base64 image langsung di message (tidak ideal)
- Upload gambar ke Supabase Storage → kirim link gambar
- Pakai WA API lain yang support image

---

## File yang Diubah (Semua)

| # | File | Perubahan |
|---|------|-----------|
| 1 | `src/app/stok/page.tsx` | Tambah "Goreng Harian" section |
| 2 | `src/hooks/useStok.ts` | Tambah `gorengHarian()` function |
| 3 | `src/components/stok/StokForm.tsx` | Hapus section resep_goreng |
| 4 | `src/components/stok/StokTable.tsx` | Hapus tombol Goreng per baris |
| 5 | `src/components/stok/GorengModal.tsx` | Hapus (tidak dipakai) |
| 6 | `src/app/order/page.tsx` | Hapus WA customer, menu collapse/expand |
| 7 | `src/components/kasir/OnlineOrders.tsx` | Popup order baru, checkbox kurasi, kirim QR image |
| 8 | `src/lib/whatsapp.ts` | Tambah `sendWhatsAppImage()` |
| 9 | `src/app/api/whatsapp/route.ts` | Support image endpoint |
| 10 | `src/lib/types.ts` | Tambah `available_items` di Order |
| 11 | `supabase/migrations/019_order_items_status.sql` | **Baru** — kolom `available_items` |

## Urutan Eksekusi
1. Simplifikasi stok (goreng harian)
2. Hapus notif dobel + popup kasir
3. Menu collapse/expand
4. Checkbox kurasi
5. Kirim gambar QRIS
6. `tsc --noEmit` verify
7. Commit & push
