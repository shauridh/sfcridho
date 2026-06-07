# Plan: Order Online Link + Notifikasi WA ke Customer & Owner

## Context
Order online flow sudah ada (`/order` page, `OnlineOrders` component, API routes), tapi ada 2 gap:
1. **Customer tidak tahu link `/order`** — owner perlu cara mudah copy link untuk set di auto-reply WA gateway
2. **Notifikasi WA salah target** — saat ini `sendWhatsApp()` selalu kirim ke nomor owner, bukan ke customer

## Perubahan yang Dibutuhkan

### 1. Tambah Section "Link Order Online" di Pengaturan → Toko

**File:** `src/app/pengaturan/page.tsx`

Tambah di tab "store" (Profil Toko), di bawah form Nama Toko:
- Box menampilkan link order: `https://{hostname}/order`
- Tombol "Copy Link" yang copy ke clipboard
- Info text: "Set link ini di auto-reply WhatsApp Gateway"

```tsx
// Di dalam tab "store", setelah form Nama Toko
<div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Link Order Online</p>
  <div className="flex items-center gap-2">
    <code className="flex-1 text-sm font-mono text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-900 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-700 truncate">
      {typeof window !== "undefined" ? `${window.location.origin}/order` : "/order"}
    </code>
    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/order`); /* show copied feedback */ }} className="...">
      Copy
    </button>
  </div>
  <p className="text-[10px] text-blue-500">Set link ini di auto-reply WhatsApp Gateway agar customer bisa langsung order</p>
</div>
```

### 2. Fix `sendWhatsApp()` — Support Custom Target Number

**File:** `src/lib/whatsapp.ts`

Ubah signature `sendWhatsApp` untuk accept optional `to` parameter:

```ts
// Sebelum
export async function sendWhatsApp(message: string): Promise<...>

// Sesudah
export async function sendWhatsApp(message: string, to?: string): Promise<...>
```

Di dalam function:
```ts
const targetPhone = to || phone; // kalau ada 'to', pakai itu; kalau tidak, pakai owner phone
// ...
body: JSON.stringify({
  api_key: apiKey,
  sender: sender,
  number: targetPhone,  // ubah dari 'phone' ke 'targetPhone'
  message: message,
  footer: `Sent via ${storeName}`,
}),
```

### 3. Fix `OnlineOrders.tsx` — Kirim WA ke Customer + Notif ke Owner

**File:** `src/components/kasir/OnlineOrders.tsx`

#### a) Saat Konfirmasi pesanan (`handleConfirm`):
```ts
// Kirim WA ke CUSTOMER
await sendWhatsApp(msgConfirm, order.phone);

// Kirim notif ke OWNER
const ownerMsg = `*${storeName}*\nPesanan baru dikonfirmasi:\n${order.nama} (${order.phone})\nTotal: Rp ${order.total.toLocaleString("id-ID")}`;
await sendWhatsApp(ownerMsg); // tanpa 'to' = kirim ke owner
```

#### b) Saat Kirim QRIS (`handleSendQRIS`):
```ts
// Kirim WA ke CUSTOMER (QRIS + link)
await sendWhatsApp(msgQris, order.phone);

// Kirim notif ke OWNER
const ownerMsg = `*${storeName}*\nQRIS dikirim ke ${order.nama} (${order.phone})\nTotal: Rp ${order.total.toLocaleString("id-ID")}`;
await sendWhatsApp(ownerMsg);
```

### 4. Tambah Notif ke Owner Saat Ada Order Baru

**File:** `src/app/order/page.tsx` (di `handleSubmit`)

Setelah insert order berhasil, kirim notif ke owner:
```ts
// Setelah INSERT orders berhasil
const ownerMsg = `*${settings.store_name || "Sabana FC"}*\nPesanan online baru!\n\nDari: ${nama}\nNo: ${phone}\nTotal: Rp ${total.toLocaleString("id-ID")}\n\nBuka kasir untuk konfirmasi.`;
await sendWhatsApp(ownerMsg); // kirim ke owner
```

Perlu import `sendWhatsApp` dan `getSettings` di `order/page.tsx`.

### 5. Tambah WA Gateway Tab di Pengaturan (Opsional Enhancement)

**File:** `src/app/pengaturan/page.tsx`

Di tab "wa" (WhatsApp Gateway), tambah info box:
- Menjelaskan cara set auto-reply di getsender.id
- Menampilkan contoh pesan auto-reply yang berisi link `/order`
- Contoh: "Untuk pesan online, kunjungi: {link}/order"

---

## File yang Diubah

| # | File | Perubahan |
|---|------|-----------|
| 1 | `src/lib/whatsapp.ts` | Tambah parameter `to?` di `sendWhatsApp()` |
| 2 | `src/components/kasir/OnlineOrders.tsx` | Kirim WA ke customer + notif ke owner |
| 3 | `src/app/order/page.tsx` | Tambah notif ke owner saat order baru masuk |
| 4 | `src/app/pengaturan/page.tsx` | Tambah section "Link Order Online" dengan copy button |

## Urutan Eksekusi
1. Fix `sendWhatsApp()` — tambah parameter `to`
2. Update `OnlineOrders.tsx` — kirim ke customer + owner
3. Update `order/page.tsx` — notif owner saat order baru
4. Update `pengaturan/page.tsx` — tampilkan link order + copy button
5. `tsc --noEmit` untuk verify

## Yang Tidak Berubah
- API routes (`/api/orders/*`) — sudah benar
- `/order` page UI — sudah benar
- Database schema — tidak perlu perubahan
- QRIS converter — tidak perlu perubahan
