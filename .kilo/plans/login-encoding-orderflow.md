# Plan: Login Restoration + Encoding Fix + Order Flow Improvement

## Context
Tiga perubahan yang diminta:
1. **Kembalikan login user** — semua halaman harus login (kecuali `/order` untuk customer)
2. **Fix encoding** — 14 karakter mojibake di 3 file (`âˆ'`, `â†'`, `Ã—`, `Â·Â·Â·Â·`)
3. **Improve order flow** — customer dapat WA "terima kasih" saat order, kasir bisa tolak jika stok habis, customer bisa kirim bukti bayar

---

## 1. Login System Restoration

### Current State
- `app_users` table sudah ada (username, pin_hash, nama, role)
- `verify_login()` RPC sudah ada di Supabase
- `AuthProvider` saat ini hanya cek shared PIN (`settings.admin_pin`)
- Tidak ada login page — langsung masuk ke dashboard

### Perubahan

#### 1a. Rewrite `src/components/AuthProvider.tsx`
- Ganti `pinVerified: boolean` → `currentUser: AppUser | null`
- Tambah `login(username, pin)` → call `supabase.rpc("verify_login", ...)`, simpan user ke localStorage
- Tambah `logout()` → hapus dari localStorage, set currentUser null
- Hapus `verifyPin()` dan `changePin()` (PIN per-user sudah ada di `app_users`)
- Di load awal: baca localStorage, restore `currentUser`
- Export: `{ currentUser, login, logout, loading }`

#### 1b. Create `src/app/login/page.tsx`
- Form: username + PIN (6 digit)
- Call `login(username, pin)` dari AuthProvider
- Jika berhasil → redirect ke `/dashboard`
- Jika gagal → tampilkan error "Username atau PIN salah"
- UI: full-screen centered card, mirip PINModal tapi dengan username field

#### 1c. Update `src/components/AppShell.tsx`
- Hapus PINModal
- Cek `currentUser` dari AuthProvider
- Jika `!currentUser` dan bukan halaman publik (`/order`) → redirect ke `/login`
- Jika `currentUser` dan di `/login` → redirect ke `/dashboard`

#### 1d. Update `src/app/pengaturan/page.tsx`
- Hapus section "Ubah PIN Admin" (PIN sekarang per-user, diubah via edit user)
- Atau ganti jadi "Ubah PIN Saya" yang update PIN user yang sedang login

#### 1e. Update `src/components/kasir/AdminPinModal.tsx`
- Sudah pakai `verify_login` — tidak perlu ubah, tapi bisa simplify jadi cek `currentUser.role === "owner"`

#### 1f. Wire `user_id` ke transaksi (opsional, bisa nanti)
- `transaksi` dan `shift` table punya kolom `user_id`
- Saat buat transaksi/shift, set `user_id = currentUser.id`

### Routes Access Control

| Route | Public | Requires Login |
|-------|--------|----------------|
| `/login` | ✅ (redirect if logged in) | — |
| `/order` | ✅ | — |
| `/dashboard` | — | ✅ |
| `/kasir` | — | ✅ |
| `/stok` | — | ✅ |
| `/produk` | — | ✅ |
| `/kas` | — | ✅ (owner only?) |
| `/pengaturan` | — | ✅ (owner only?) |

---

## 2. Fix Encoding Issues (14 occurrences)

### `src/app/kas/page.tsx`
| Line | Mojibake | Fix |
|------|----------|-----|
| 185 | `âˆ'` | `−` |
| 205 | `âˆ'` (×2) | `−` |
| 221 | `âˆ'` | `−` |
| 222 | `âˆ'` | `−` |
| 225 | `âˆ'` | `−` |
| 226 | `âˆ'` | `−` |
| 263 | `â†'` | `→` |
| 281 | `â†'` | `→` |

### `src/components/laporan/TransactionList.tsx`
| Line | Mojibake | Fix |
|------|----------|-----|
| 62 | `Ã—` (×2) | `×` |
| 63 | `Ã—` | `×` |
| 117 | `Ã—` | `×` |

### `src/components/kasir/AdminPinModal.tsx`
| Line | Mojibake | Fix |
|------|----------|-----|
| 52 | `Â·Â·Â·Â·` | `····` |

---

## 3. Order Flow Improvement

### Current Flow (Bermasalah)
```
Customer submit → Owner dapat WA → Kasir konfirmasi → Customer dapat WA → Kirim QRIS → Customer bayar
```
**Masalah:** Customer tidak dapat notif awal, tidak ada cara kasir tolak, tidak ada cara customer kirim bukti bayar.

### New Flow
```
Customer submit → Customer dapat WA "Terima kasih, admin akan cek stok"
                → Owner dapat WA "Pesanan baru dari [nama]"

Kasir cek stok:
  ✅ Ada stok → Kasir klik "Konfirmasi" → Customer dapat WA "Pesanan dikonfirmasi + QRIS"
  ❌ Tidak ada → Kasir klik "Tidak Tersedia" + catatan opsional → Customer dapat WA "Maaf, [item] tidak tersedia. [catatan]"

Customer bayar → Klik link konfirmasi → Status: paid
              → (Opsional) Customer reply WA dengan foto bukti bayar

Kasir klik "Selesai" → Status: done
```

### Status Baru
```
pending  →  confirmed  →  paid  →  done
   ↓            ↓
unavailable    ↓
           cancelled
```

Tambah status `"unavailable"` untuk kasir tolak pesanan karena stok habis.

### Perubahan File

#### 3a. `src/app/order/page.tsx`
- Setelah insert order berhasil, kirim WA ke **customer** (bukan hanya owner):
  ```
  *Sabana FC*
  Terima kasih telah memesan!
  
  Pesanan Anda:
  - Geprek Dada x2
  - Es Teh x1
  Total: Rp 35.000
  
  Admin akan mengecek ketersediaan dan menghubungi Anda via WhatsApp.
  ```
- Tetap kirim WA ke owner juga (sudah ada)

#### 3b. `src/components/kasir/OnlineOrders.tsx`
- **Gabungkan "Konfirmasi" + "Kirim QRIS" jadi satu tombol** — kasir langsung kirim konfirmasi + QRIS sekaligus (lebih simpel)
- **Tambah tombol "Tidak Tersedia"** untuk status `pending`:
  - Munculkan input catatan opsional (misal "Ayam habis, mau diganti paha?")
  - Update status ke `unavailable`
  - Kirim WA ke customer:
    ```
    *Sabana FC*
    Maaf, pesanan Anda tidak tersedia saat ini.
    
    [Catatan dari kasir, jika ada]
    
    Silakan pesan kembali lain waktu.
    ```
  - Kirim WA ke owner: "Pesanan [nama] ditolak (tidak tersedia)"
- **Tambah notif WA ke customer saat "Selesai"**:
  ```
  *Sabana FC*
  Pesanan Anda telah selesai! Terima kasih 🙏
  ```
- **Tambah notif WA ke customer saat "Batal"**:
  ```
  *Sabana FC*
  Pesanan Anda telah dibatalkan.
  ```

#### 3c. `src/lib/types.ts`
- Tambah `"unavailable"` ke status union type:
  ```typescript
  status: "pending" | "confirmed" | "paid" | "done" | "cancelled" | "unavailable"
  ```

#### 3d. `supabase/migrations/017_order_unavailable.sql`
- Update CHECK constraint di tabel `orders` untuk include `"unavailable"`:
  ```sql
  ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
  ALTER TABLE orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('pending', 'confirmed', 'paid', 'done', 'cancelled', 'unavailable'));
  ```

#### 3e. Update status badge di `OnlineOrders.tsx`
- Tambah badge untuk `unavailable`: abu-abu "Tidak Tersedia"

---

## File yang Diubah

| # | File | Perubahan |
|---|------|-----------|
| 1 | `src/components/AuthProvider.tsx` | Rewrite: currentUser + login/logout |
| 2 | `src/app/login/page.tsx` | **Baru** — login page dengan username + PIN |
| 3 | `src/components/AppShell.tsx` | Redirect ke /login jika belum login |
| 4 | `src/app/kas/page.tsx` | Fix 9 encoding issues |
| 5 | `src/components/laporan/TransactionList.tsx` | Fix 4 encoding issues |
| 6 | `src/components/kasir/AdminPinModal.tsx` | Fix 1 encoding issue |
| 7 | `src/app/order/page.tsx` | Tambah WA ke customer saat order |
| 8 | `src/components/kasir/OnlineOrders.tsx` | Gabung konfirmasi+QRIS, tambah "Tidak Tersedia", notif WA lengkap |
| 9 | `src/lib/types.ts` | Tambah `"unavailable"` status |
| 10 | `supabase/migrations/017_order_unavailable.sql` | **Baru** — update CHECK constraint |
| 11 | `src/app/pengaturan/page.tsx` | Hapus/ganti section "Ubah PIN Admin" |

## Urutan Eksekusi
1. Fix encoding issues (quick win, 3 file)
2. Rewrite AuthProvider + create login page + update AppShell
3. Update order flow (types, migration, order page, OnlineOrders)
4. Update pengaturan page (PIN section)
5. `tsc --noEmit` verify
6. Commit & push
