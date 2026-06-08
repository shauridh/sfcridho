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

1. **Jalankan migrations** di Supabase SQL Editor (010-019)
2. **Testing delete produk** setelah migration 010
3. **Testing mobile** di HP fisik (semua page sudah responsive)
4. **Testing QRIS image** — cek apakah getsender.id support send-image endpoint
5. **Push & deploy**





The user wants me to implement the resep_goreng plan. Let me start working through it step by step.

Migration SQL
Types update
useStok.ts — goreng function
GorengModal — preview
StokForm — config UI
stok/page.tsx — pass props
tsc --noEmit verify
Commit & push







Let me start implementing step by step.

Step 1: Migration SQL

Step 1: Migration SQL
Step 2: Types update

Step 2: Types — tambah resep_goreng ke BahanBaku
I need to add resep_goreng field to the BahanBaku interface. It should be an array of objects with bahan_id and qty_per_kantong.

Step 3: Update useStok.ts — goreng function





3 later to-dos hidden
Step 3: Update useStok.ts — goreng function to auto-deduct bahan resep

Step 3: useStok.ts — update goreng() untuk auto-deduct bahan resep
Now I need to update the goreng function to handle resep_goreng auto-deduction. The function needs to:

Check if bahan has resep_goreng
Validate all linked bahan have enough stok
Deduct linked bahan stok
Log each deduction
Step 4: GorengModal — preview bahan resep + validasi stok

Step 4: GorengModal — preview bahan resep + validasi stok
Now I need to update GorengModal to:

Accept allBahan prop to resolve resep_goreng names and stok
Show preview of linked bahan consumption
Validate linked bahan stok
Let me rewrite the GorengModal.

Step 5: StokForm — UI config resep goreng

Step 5: StokForm — UI config resep goreng
Now I need to update StokForm to:1. Accept allBahan prop 2. Add resep_goreng state 3. Add UI section for configuring resep_goreng (only when editing) 4. Include resep_goreng in the onSave dataLet me update the file.

Now add the resep_goreng state and update the form component.

Now update the handleSubmit to include resep_goreng.

Now add the resep_goreng UI section before the action buttons. I need to add it after the stok conversion banner and before the buttons.

Now add the resep_goreng UI section before the action buttons:

Step 6: stok/page.tsx — pass allBahan ke modal/form

Step 6: stok/page.tsx — pass allBahan ke GorengModal & StokForm
I need to pass bahanBaku as allBahan prop to StokForm and GorengModal.

Now let me verify TypeScript compiles clean and then commit & push.

Step 7: Verify TypeScript + commit & push
Command
npx tsc --noEmit 2>&1
Output
(no output)
TypeScript compiles clean. Now let me update the TODO.md and commit & push.

TypeScript clean. Update TODO.md:

Found multiple matches for oldString. Provide more surrounding context to make the match unique.
Let me read the TODO.md to find the right context.

Now I can see the exact context. Let me update the migration list.

Now commit and push.

Command
git add -A; git status
Output
warning: in the working copy of 'TODO.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'src/components/stok/GorengModal.tsx', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of '.kilo/plans/resep-goreng-auto-deduct.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'supabase/migrations/016_resep_goreng.sql', LF will be replaced by CRLF the next time Git touches it
On branch main
Your branch is up to date with 'origin/main'.

Changes to be committed:
  (use "git restore --staged <file>..." to unstage)
	new file:   .kilo/plans/resep-goreng-auto-deduct.md
	modified:   TODO.md
	modified:   src/app/stok/page.tsx
	modified:   src/components/stok/GorengModal.tsx
	modified:   src/components/stok/StokForm.tsx
	modified:   src/hooks/useStok.ts
	modified:   src/lib/types.ts
	new file:   supabase/migrations/016_resep_goreng.sql

Now commit and push.

Command
git commit -m "feat: resep goreng — auto-deduct tepung & minyak saat goreng batch

- Migration 016: tambah kolom resep_goreng JSONB di bahan_baku
- BahanBaku interface: tambah resep_goreng field
- useStok.ts goreng(): validasi & auto-deduct bahan resep dari stok
- GorengModal: preview bahan terpakai (tepung, minyak, dll) + warning stok
- StokForm: UI config resep goreng (select bahan + qty per kantong)
- stok/page.tsx: pass allBahan ke GorengModal & StokForm

Contoh: 3 pak ayam butuh 1 kg tepung + 0.6L minyak
→ qty_per_kantong tepung = 0.333, minyak = 0.2"
Output
[main c31da06] feat: resep goreng — auto-deduct tepung & minyak saat goreng batch
 8 files changed, 290 insertions(+), 14 deletions(-)
 create mode 100644 .kilo/plans/resep-goreng-auto-deduct.md
 create mode 100644 supabase/migrations/016_resep_goreng.sql
Now push to GitHub.

Command
git push origin main
Output
To https://github.com/shauridh/sfcridho.git
   cb68791..c31da06  main -> main
Pushed successfully. Let me update the todo list.








Done. Let me provide a summary of what was implemented.

Sudah di-push: c31da06 feat: resep goreng

Yang Diimplementasi
File	Perubahan
supabase/migrations/016_resep_goreng.sql	Kolom resep_goreng JSONB di bahan_baku
src/lib/types.ts	resep_goreng: { bahan_id, qty_per_kantong }[] di BahanBaku
src/hooks/useStok.ts	goreng() — validasi stok bahan resep + auto-deduct
src/components/stok/GorengModal.tsx	Preview bahan terpakai + warning stok tidak cukup
src/components/stok/StokForm.tsx	UI config resep goreng (dropdown bahan + qty)
src/app/stok/page.tsx	Pass bahanBaku ke GorengModal & StokForm
Cara Pakai Setelah Deploy
Jalankan migration 016_resep_goreng.sql di Supabase SQL Editor
Tambah bahan "Tepung": sat_beli=kg, sat_dasar=kg, isi_per_pak=1
Tambah bahan "Minyak Goreng": sat_beli=pouch, sat_dasar=liter, isi_per_pak=2
Edit bahan "Ayam" → scroll ke bawah → section "Resep Goreng":
Tambah → pilih Tepung → isi 0.333 (per kantong)
Tambah → pilih Minyak → isi 0.2 (per kantong)
Goreng 3 pak ayam → otomatis: tepung −1 kg, minyak −0.6 liter

