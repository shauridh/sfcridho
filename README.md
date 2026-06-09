# Sabana FC POS

Sistem Point of Sale (POS) dan manajemen bahan baku untuk Sabana Fried Chicken. Mendukung transaksi kasir, manajemen stok dengan forecasting, kas/keuangan, shift kasir, order online via WhatsApp, dan laporan harian. Dibangun sebagai PWA sehingga bisa di-install di HP.

## Stack

- **Next.js 14** (App Router) + React 18 + TypeScript
- **Supabase** (PostgreSQL, RPC, Row Level Security)
- **Tailwind CSS** untuk styling
- **PWA** via `@ducanh2912/next-pwa`
- **recharts** (grafik), **jsqr** + **qrcode** (QRIS), **lucide-react** (ikon)

## Prasyarat

- Node.js 20+
- Project Supabase (gratis cukup)

## Environment Variables

Buat file `.env.local` di root:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# WAJIB di server (Vercel/host) — dipakai API routes untuk operasi privileged
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

> `SUPABASE_SERVICE_ROLE_KEY` jangan diberi prefix `NEXT_PUBLIC_`. Key ini hanya untuk server (API routes), tidak boleh sampai ke browser. Jika tidak diset, API routes jatuh ke anon key dan kehilangan privilege.

## Setup Database

Jalankan file di `supabase/migrations/` secara berurutan (001 → 027) lewat Supabase SQL Editor. Belum ada tooling migrasi otomatis, jadi urutan harus dijaga manual.

Migration penting:

- `001`–`024`: schema dasar, transaksi, stok, kas, order, dll.
- `025_secure_pins.sql`: hashing PIN (bcrypt) + kunci akses `app_users`.
- `026_transaction_integrity.sql`: validasi stok + hapus overload fungsi lama.
- `027_public_settings.sql`: whitelist setting untuk halaman publik `/order`.

Setelah migration 025, user default punya PIN yang sudah di-hash. User awal (lihat migration 004): `admin` / `kasir1` dengan PIN `1234` — **ganti segera** lewat menu Pengaturan.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build produksi
npm run start    # jalankan hasil build
npm run lint     # ESLint
```

## Struktur

```
src/
  app/            # routes (App Router)
    api/          # API routes (whatsapp proxy, orders)
    kasir/        # halaman kasir / POS
    stok/         # manajemen bahan baku + forecasting
    kas/          # kas, opex, piutang/hutang
    order/        # halaman publik order online (tanpa login)
    pengaturan/   # konfigurasi toko, user, WA, QRIS, PIN
    dashboard/    # ringkasan & laporan
  components/     # komponen UI (modal, form, nav, dll.)
  hooks/          # data hooks (useStok, useTransaksi, useKas, dll.)
  lib/            # supabase client, types, utils, whatsapp, qris
supabase/
  migrations/     # SQL migrations (jalankan berurutan)
```

## Catatan Keamanan

- PIN di-hash dengan bcrypt (pgcrypto). Semua operasi tulis ke `app_users` lewat RPC `SECURITY DEFINER`, bukan akses tabel langsung.
- Kredensial WhatsApp (`wa_api_key`) di-resolve server-side di `/api/whatsapp` dan tidak pernah dikirim dari browser.
- Halaman publik `/order` hanya membaca setting non-sensitif via `get_public_settings()`.

**Keterbatasan saat ini:** aplikasi belum memakai Supabase Auth sungguhan — sebagian besar tabel masih bisa diakses memakai anon key. Untuk produksi dengan data sensitif, migrasikan ke Supabase Auth dan terapkan RLS berbasis `auth.uid()`. Lihat `TODO.md`.

## Deploy

Deploy ke Vercel. Set semua environment variable di atas (termasuk `SUPABASE_SERVICE_ROLE_KEY`) di dashboard Vercel sebelum deploy.
