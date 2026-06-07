# Sabana FC POS — TODO & Known Issues
## Session 7 Juni 2025

### 🔴 Build Error (WAJIB FIX DULU)

| Issue | File | Detail |
|-------|------|--------|
| `onClose` not defined | `src/app/kas/page.tsx:435` | Batal button di form Opex pakai `onClick={onClose}` tapi tidak ada variable `onClose`. Harus ganti dengan `onClick={() => setShowOpexForm(false)}` |
| Sama untuk Piutang form | `src/app/kas/page.tsx:475` | Sama — `onClick={onClose}` harus jadi `onClick={() => setShowPiutangForm(false)}` |
| Sama untuk Pengaturan | `src/app/pengaturan/page.tsx:408,441` | User form & Akun form Batal button — `onClick={onClose}` harus jadi `onClick={() => setShowUserForm(false)}` / `onClick={() => setShowAkunForm(false)}` |

**Root cause:** Batch regex fix yang menghapus `onClick={onClose}` dari overlay juga menghapus `onClick` dari button Batal. Kemudian restore salah — kas/piutang/opex/pengaturan forms tidak punya `onClose` function, hanya punya `setShowXxxForm(false)`.

---

### 🟡 Fitur Belum Selesai

| # | Fitur | Status | Detail |
|---|-------|--------|--------|
| 1 | **Order Online WA** | 70% | `/order` page sudah jadi, `OnlineOrders` component sudah jadi. TAPI belum diintegrasikan ke kasir page (belum import OnlineOrders). Kasir belum bisa lihat pesanan online. |
| 2 | **API Routes Order** | 0% | `/api/orders/route.ts`, `/api/orders/[id]/confirm/route.ts`, `/api/orders/[id]/pay/route.ts`, `/api/orders/confirm/[token]/route.ts` — belum dibuat. Flow konfirmasi → QRIS → link belum jalan. |
| 3 | **OnlineOrders di Kasir** | 0% | Component sudah dibuat tapi belum di-render di kasir page. Perlu tambah tab/section di kasir. |
| 4 | **Produk Delete** | 50% | Migration `010_fix_cascade.sql` sudah dibuat tapi **belum dijalankan di Supabase**. Delete produk masih gagal jika ada `transaksi_item` yang reference. Jalankan migration 010 dulu. |

---

### 🟡 Mobile Responsive

| Issue | Detail |
|-------|--------|
| Sidebar → BottomNav | Sudah dibuat `BottomNav.tsx` dan `AppShell.tsx` sudah update. Tapi perlu testing di HP. |
| Dashboard padding | Sudah fix `p-4 md:p-6`, `text-xl md:text-2xl` |
| Stok/Produk padding | Sudah fix |
| Kas page | **Belum di-fix** untuk mobile |
| Kasir page | **Belum di-fix** untuk mobile (grid produk + cart) |
| Pengaturan page | **Belum di-fix** untuk mobile |
| StokTable | Masih overflow di HP karena banyak kolom — perlu scroll horizontal atau hide kolom |

---

### 🟡 Modal Issues

| Modal | X Button | Batal/Button | Status |
|-------|----------|-------------|--------|
| PaymentModal | ✅ Fixed | ✅ | OK |
| ReceiptStruk | ✅ Fixed | ✅ Fixed | OK |
| ShiftModals | ✅ Fixed | ✅ | OK |
| RestockModal | ✅ Fixed | ✅ | OK |
| OpnameModal | ✅ Fixed | ✅ | OK |
| BulkInputModal | ✅ Fixed | ✅ Fixed | OK |
| TransactionList | ✅ Fixed | N/A | OK |
| PINModal | ✅ | ✅ | OK |
| StokForm | ✅ | ✅ | OK |
| ProdukForm | ✅ | ✅ | OK |
| Kas Form | N/A | ❌ `onClose` error | **BELUM FIX** |
| Opex Form | N/A | ❌ `onClose` error | **BELUM FIX** |
| Piutang Form | N/A | ❌ `onClose` error | **BELUM FIX** |
| User Form (Pengaturan) | N/A | ❌ `onClose` error | **BELUM FIX** |
| Akun Form (Pengaturan) | N/A | ❌ `onClose` error | **BELUM FIX** |

---

### 🟢 Migration SQL — WAJIB JALANKAN DI SUPABASE

```
010_fix_cascade.sql      ← Fix FK constraint untuk delete
011_kategori_table.sql   ← Tabel kategori stok & produk
012_avg_daily.sql        ← Kolom avg_daily di bahan_baku
013_orders.sql           ← Tabel orders (SUDAH FIX quote issue)
014_admin_pin.sql        ← PIN default 271222 (SUDAH FIX quote issue)
015_stok_goreng.sql      ← Kolom stok_goreng untuk batch goreng
```

---

### 🟢 Fitur Sudah Selesai & Working

- ✅ PIN auth system (hapus login, PIN protect Kas & Pengaturan)
- ✅ CRUD Kategori terpisah stok & produk
- ✅ Avg harian manual input
- ✅ Hapus target dari dashboard
- ✅ Batch goreng ayam (stok mentah → stok goreng per kantong)
- ✅ WhatsApp notifikasi fix (server-side proxy)
- ✅ QRIS dinamis (upload gambar + generate)
- ✅ Bulk input produk + stok + template Excel
- ✅ Dashboard metode pembayaran
- ✅ Transaction detail modal
- ✅ Hutang bunga + lunas action
- ✅ Media penyimpanan (akun) CRUD
- ✅ Stok opname
- ✅ Stok forecasting (avg_daily manual)
- ✅ Forecast banner
- ✅ Tutup kasir → auto redirect dashboard + WA laporan + stok opname

---

### 📋 Urutan Fix Prioritas

1. **Fix build error** — kas/page.tsx & pengaturan/page.tsx `onClose` references
2. **Jalankan migrations** di Supabase SQL Editor
3. **Testing delete produk** setelah migration 010
4. **Mobile responsive** — kas, kasir, pengaturan pages
5. **Order online** — API routes + integrasi OnlineOrders ke kasir
6. **Push & deploy**
