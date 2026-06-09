# Sabana FC POS — TODO & Known Issues
## Session 7 Juni 2025 (Updated)

### ~~🔴 Build Error~~ ✅ FIXED

| Issue | File | Status |
|-------|------|--------|
| `onClose` not defined — Opex form | `src/app/kas/page.tsx` | ✅ Fixed: `onClick={() => setShowOpexForm(false)}` |
| `onClose` not defined — Piutang form | `src/app/kas/page.tsx` | ✅ Fixed: `onClick={() => setShowPiutangForm(false)}` |
| `onClose` not defined — User form | `src/app/pengaturan/page.tsx` | ✅ Fixed: `onClick={() => setShowUserForm(false)}` |
| `onClose` not defined — Akun form | `src/app/pengaturan/page.tsx` | ✅ Fixed: `onClick={() => setShowAkunForm(false)}` |
| Batal button no onClick — Kas form | `src/app/kas/page.tsx` | ✅ Fixed: `onClick={() => setShowForm(false)}` |

---

### ~~🟡 Fitur Belum Selesai~~ ✅ SELESAI

| # | Fitur | Status | Detail |
|---|-------|--------|--------|
| 1 | **Order Online WA** | ✅ 100% | OnlineOrders sudah diintegrasikan ke kasir page (toggle "Online" button) |
| 2 | **API Routes Order** | ✅ 100% | `/api/orders/route.ts`, `/api/orders/[id]/confirm/route.ts`, `/api/orders/[id]/pay/route.ts`, `/api/orders/confirm/[token]/route.ts` — sudah dibuat |
| 3 | **OnlineOrders di Kasir** | ✅ 100% | Component di-render di kasir page dengan collapsible panel |
| 4 | **Produk Delete** | 50% | Migration `010_fix_cascade.sql` sudah dibuat tapi **belum dijalankan di Supabase**. Jalankan migration 010 dulu. |

---

### ~~🟡 Mobile Responsive~~ ✅ FIXED

| Issue | Status |
|-------|--------|
| Sidebar → BottomNav | ✅ Sudah ada |
| Dashboard padding | ✅ Sudah fix |
| Stok/Produk padding | ✅ Sudah fix |
| Kas page | ✅ Fixed: `p-4 md:p-6`, responsive grids, overflow-x-auto tables, responsive date nav |
| Kasir page | ✅ Fixed: mobile cart (floating button + bottom sheet), responsive product grid (2 cols mobile), `p-3 md:p-4` |
| Pengaturan page | ✅ Fixed: `p-4 md:p-6`, scrollable tabs, responsive headers, overflow-x-auto tables |
| StokTable | ✅ Fixed: hidden columns on mobile (Kategori sm, Avg/Hari md, Cukup md, 7 Hari lg), compact action buttons |

---

### ~~🟡 Modal Issues~~ ✅ ALL FIXED

| Modal | Status |
|-------|--------|
| PaymentModal | ✅ OK |
| ReceiptStruk | ✅ OK |
| ShiftModals | ✅ OK |
| RestockModal | ✅ OK |
| OpnameModal | ✅ OK |
| BulkInputModal | ✅ OK |
| TransactionList | ✅ OK |
| PINModal | ✅ OK |
| StokForm | ✅ OK |
| ProdukForm | ✅ OK |
| Kas Form | ✅ Fixed |
| Opex Form | ✅ Fixed |
| Piutang Form | ✅ Fixed |
| User Form (Pengaturan) | ✅ Fixed |
| Akun Form (Pengaturan) | ✅ Fixed |

---

### 🟢 Migration SQL — WAJIB JALANKAN DI SUPABASE

```
010_fix_cascade.sql      ← Fix FK constraint untuk delete
011_kategori_table.sql   ← Tabel kategori stok & produk
012_avg_daily.sql        ← Kolom avg_daily di bahan_baku
013_orders.sql           ← Tabel orders (SUDAH FIX quote issue)
014_admin_pin.sql        ← PIN default 271222 (SUDAH FIX quote issue)
015_stok_goreng.sql      ← Kolom stok_goreng untuk batch goreng
016_resep_goreng.sql     ← Kolom resep_goreng untuk auto-deduct tepung/minyak
017_order_unavailable.sql ← Status 'unavailable' untuk tolak pesanan
018_order_location.sql    ← Kolom location_url untuk GPS tagging
019_order_available_items.sql ← Kolom available_items untuk kurasi kasir
020_order_ongkir.sql          ← Kolom subtotal & ongkir di orders
021_addons.sql                ← Tabel addons untuk varian produk
022_produk_has_addons.sql     ← Kolom has_addons di produk (toggle per produk)
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
- ✅ Build errors fixed (onClose references)
- ✅ Mobile responsive (kas, kasir, pengaturan, stok table)
- ✅ Order online API routes
- ✅ OnlineOrders integrated di kasir

---

### 📋 Sisa Yang Perlu Dilakukan

1. **Jalankan migrations** di Supabase SQL Editor (urut, terutama 025-027 untuk keamanan)
2. **Set `SUPABASE_SERVICE_ROLE_KEY`** di environment server (Vercel) — API routes butuh ini
3. **Testing delete produk** setelah migration 010
4. **Testing mobile** di HP fisik (semua page sudah responsive)
5. **Testing QRIS image** — cek apakah getsender.id support send-image endpoint
6. **Push & deploy**

---

### 🔐 Catatan Keamanan (migration 025-027)

- PIN sekarang di-hash bcrypt (pgcrypto). Migration 025 otomatis hash PIN lama.
- Tabel `app_users`: kolom `pin_hash` tidak lagi bisa dibaca/ditulis langsung dari client. Semua tulis lewat RPC (`app_create_user`, `app_update_user`, `app_set_pin`, `app_set_user_aktif`).
- `wa_api_key` tidak lagi dikirim dari browser — di-resolve server-side di `/api/whatsapp`.
- Halaman publik `/order` hanya membaca setting non-sensitif via `get_public_settings()`.
- **Belum tertangani:** tabel `settings` & tabel data lain masih terbuka untuk anon key karena app belum pakai Supabase Auth sungguhan. Untuk produksi serius, migrasikan ke Supabase Auth + RLS berbasis `auth.uid()`.
- Route `/api/orders` (GET/POST), `/api/orders/[id]/confirm`, `/api/orders/[id]/pay` dihapus — tidak terpakai & membocorkan data customer tanpa auth. Order dibuat/diupdate langsung via Supabase client; pembayaran lewat `/api/orders/confirm/[token]` (token = secret).

