# Plan: Fix Order Scroll + Add GPS Location

## Context
1. **Scroll bug**: `/order` page tidak bisa di-scroll di mobile. Root cause: `body { overflow: hidden }` di `globals.css:21`. Halaman `/order` dirender langsung tanpa scrollable wrapper (AppShell hanya wrap halaman authenticated).
2. **GPS Location**: Customer mau bisa tag lokasi pengiriman. Pakai approach GPS + Google Maps link (tanpa library tambahan).

---

## 1. Fix Scroll Issue

### Root Cause
`src/app/globals.css` line 21: `body { overflow: hidden }`

Ini mencegah scrolling di semua halaman. Untuk halaman authenticated, AppShell punya `overflow-auto` di content area. Tapi `/order` (public route) dirender langsung tanpa wrapper scrollable.

### Fix
**File:** `src/app/globals.css`

```css
/* Sebelum */
body {
  overflow: hidden;
}

/* Sesudah */
body {
  overflow: auto;
}
```

AppShell sudah punya `overflow-hidden` di root div-nya (`<div className="flex h-dvh overflow-hidden">`), jadi authenticated pages tetap tidak double-scrollbar. Public pages seperti `/order` bisa scroll natural.

---

## 2. Add GPS Location Feature

### Perubahan

#### 2a. Migration: tambah kolom `location_url` di orders
**File baru:** `supabase/migrations/018_order_location.sql`

```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS location_url TEXT;
```

#### 2b. Types: tambah `location_url` ke Order interface
**File:** `src/lib/types.ts`

```typescript
export interface Order {
  // ... existing fields
  location_url: string | null;
}
```

#### 2c. Order page: tambah tombol "Lokasi Saya"
**File:** `src/app/order/page.tsx`

Tambah state:
```typescript
const [locationUrl, setLocationUrl] = useState("");
const [locating, setLocating] = useState(false);
```

Tambah tombol di form (di bawah field Alamat):
```tsx
<button type="button" onClick={handleGetLocation} disabled={locating}>
  {locating ? "Mengambil lokasi..." : "📍 Lokasi Saya"}
</button>
{locationUrl && (
  <a href={locationUrl} target="_blank" className="text-xs text-blue-500">
    ✓ Lokasi tersimpan — buka di Maps
  </a>
)}
```

Function `handleGetLocation`:
```typescript
const handleGetLocation = () => {
  if (!navigator.geolocation) {
    alert("Browser tidak mendukung GPS");
    return;
  }
  setLocating(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
      setLocationUrl(url);
      setLocating(false);
    },
    (err) => {
      alert("Gagal mengambil lokasi: " + err.message);
      setLocating(false);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};
```

Update insert order:
```typescript
await supabase.from("orders").insert({
  // ... existing fields
  location_url: locationUrl || null,
});
```

Update WA message (ke customer & owner) — tambahkan link lokasi jika ada:
```typescript
const locationLine = locationUrl ? `\n📍 Lokasi: ${locationUrl}` : "";
// Tambahkan locationLine di pesan owner
```

#### 2d. OnlineOrders: tampilkan link lokasi
**File:** `src/components/kasir/OnlineOrders.tsx`

Di card order, setelah alamat, tambah:
```tsx
{order.location_url && (
  <a href={order.location_url} target="_blank" className="text-xs text-blue-500 flex items-center gap-1">
    📍 Buka di Maps
  </a>
)}
```

---

## File yang Diubah

| # | File | Perubahan |
|---|------|-----------|
| 1 | `src/app/globals.css` | `overflow: hidden` → `overflow: auto` |
| 2 | `supabase/migrations/018_order_location.sql` | **Baru** — kolom `location_url` |
| 3 | `src/lib/types.ts` | Tambah `location_url` ke Order |
| 4 | `src/app/order/page.tsx` | Tombol "Lokasi Saya" + GPS + Maps link |
| 5 | `src/components/kasir/OnlineOrders.tsx` | Tampilkan link Maps di card order |

## Urutan Eksekusi
1. Fix `globals.css` (scroll)
2. Migration SQL
3. Types update
4. Order page: GPS button
5. OnlineOrders: Maps link display
6. `tsc --noEmit` verify
7. Commit & push
