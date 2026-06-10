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
npm run dev         # http://localhost:3000
npm run build       # build produksi
npm run start       # jalankan hasil build
npm run lint        # ESLint
npm test            # Vitest unit tests
npm run test:watch  # Vitest watch mode
```

## Struktur

```
src/
  app/            # routes (App Router)
    api/          # API routes (whatsapp proxy, orders/confirm)
    kasir/        # halaman kasir / POS
    stok/         # manajemen bahan baku + forecasting
    kas/          # kas, opex, piutang/hutang
    order/        # halaman publik order online (tanpa login)
    pengaturan/   # konfigurasi toko, user, WA, QRIS, PIN
    dashboard/    # ringkasan & laporan
  components/     # komponen UI (modal, form, nav, loading, empty state)
  hooks/          # data hooks (useStok, useTransaksi, useKas, dll.)
  lib/            # supabase, types, utils, whatsapp, qris, forecast
    *.test.ts     # unit tests (Vitest)
supabase/
  migrations/     # SQL migrations (jalankan berurutan 001-027)
```

## Testing

Proyek ini menggunakan **Vitest** untuk unit testing. Test coverage saat ini:

- `lib/utils.test.ts` — formatting (Rupiah, angka, stok), parsing, konversi satuan (11 test)
- `lib/types.test.ts` — status stok (aman/rendah/kritis/habis) (5 test)
- `lib/forecast.test.ts` — logika forecasting stok (sisa hari, reorder qty, urgent, estimasi) (9 test)

**Total: 25 test**. Jalankan dengan `npm test` atau `npm run test:watch`.

## Catatan Keamanan

- PIN di-hash dengan bcrypt (pgcrypto). Semua operasi tulis ke `app_users` lewat RPC `SECURITY DEFINER`, bukan akses tabel langsung.
- Kredensial WhatsApp (`wa_api_key`) di-resolve server-side di `/api/whatsapp` dan tidak pernah dikirim dari browser.
- Halaman publik `/order` hanya membaca setting non-sensitif via `get_public_settings()`.
- Stok divalidasi di RPC `process_transaction` sebelum deduct (migration 026) — transaksi ditolak jika stok tidak cukup.

**Keterbatasan saat ini:** aplikasi belum memakai Supabase Auth sungguhan — sebagian besar tabel masih bisa diakses memakai anon key. Untuk produksi dengan data sensitif, migrasikan ke Supabase Auth dan terapkan RLS berbasis `auth.uid()`. Lihat `TODO.md`.

## UI/UX

- **Loading state konsisten** — `LoadingScreen` dengan spinner dipakai di semua halaman (dashboard, stok, kasir, kas, produk).
- **Empty state konsisten** — `EmptyState` dengan ikon & pesan untuk tabel/list kosong (pengaturan akun, kas, opex, piutang).
- **Alert banner dismissible** — peringatan stok kritis bisa ditutup dan diingat di localStorage.
- **Aksesibilitas** — `aria-label` pada tombol ikon-only, `next/image` untuk optimasi foto produk.
- **Ikon konsisten** — Lock (tutup kasir), Power (toggle aktif/nonaktif), bukan ikon menyesatkan.

## Deploy

Deploy ke Vercel. Set semua environment variable di atas (termasuk `SUPABASE_SERVICE_ROLE_KEY`) di dashboard Vercel sebelum deploy.

## Kontribusi & Development

1. Clone repo dan install dependencies: `npm install`
2. Jalankan migration database (001-027) di Supabase SQL Editor
3. Set `.env.local` dengan kredensial Supabase
4. `npm run dev` untuk development
5. `npm test` sebelum commit — pastikan semua test hijau
6. `npm run lint` — pastikan tidak ada warning/error
7. Commit dengan konvensi: `feat:`, `fix:`, `test:`, `perf:`, `refactor:`, `docs:`
