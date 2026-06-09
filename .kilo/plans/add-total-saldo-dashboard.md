# Plan: Tambah Total Kas/Saldo di Dashboard & Kas Page

## Tujuan
Menambahkan perhitungan **Total Kas/Saldo Keseluruhan** yang menggabungkan:
1. Uang dari **omset transaksi** (drawer/shift) - cash sales
2. Uang dari **kas manual** (masuk/keluar) - operational cash flow
3. Uang di **akun-akun** lain (bank, e-wallet, kas fisik lain) - jika ada saldo tracking

## Masalah Saat Ini

Berdasarkan eksplorasi:
- `transaksi` table dan `kas` table adalah **sistem terpisah**, tidak saling sync
- `totalKasAll` di Kas page hanya menghitung dari `kas` table (manual entries)
- Uang dari penjualan cash (`metode_pembayaran: "tunai"`) hanya muncul di shift report
- **Tidak ada view terpusat** yang menunjukkan total uang keseluruhan bisnis

## Analisis Data Flow

```
TOTAL SALDO = A + B + C

A. Cash dari Transaksi (Drawer)
   - SUM(transaksi.total) WHERE metode_pembayaran = 'tunai'
   - Atau bisa ambil dari shift.kas_akhir (jika sudah tutup shift)
   
B. Kas Manual (Operasional)
   - SUM(kas.nominal WHERE tipe='masuk') - SUM(kas.nominal WHERE tipe='keluar')
   - Ini sudah ada di useKas.totalKasAll
   
C. Saldo Akun Lain (Optional - perlu tracking)
   - Untuk setiap akun (bank, e-wallet), hitung:
     - Kas masuk KE akun: SUM(kas.nominal WHERE tipe='masuk' AND tujuan_akun_id=akun.id)
     - Kas keluar DARI akun: SUM(kas.nominal WHERE tipe='keluar' AND sumber_akun_id=akun.id)
     - Saldo akun = masuk - keluar
```

## Pertanyaan untuk User

1. **Drawer Cash vs Kas Manual**: 
   - Apakah uang dari penjualan tunai (drawer) dihitung TERPISAH atau sudah termasuk dalam kas manual?
   - Skenario biasa: Tutup shift → uang dari drawer dipindah ke kas/bank → dicatat sebagai kas entry
   - Jika iya, berarti kita harus hati-hati agar tidak double count

2. **Tracking Saldo Akun**:
   - Apakah setiap akun (bank, e-wallet) perlu tracking saldo?
   - Atau cukup total kas keseluruhan tanpa breakdown per akun?

3. **Modal Awal (shift.modal_awal)**:
   - Apakah modal awal shift berasal dari kas? Jika ya, ini bisa jadi double counting

## Asumsi Plan (perlu konfirmasi user)

**Asumsi 1**: Uang dari shift/drawer BELUM tercatat di kas manual sampai kasir tutup shift dan memindahkan uang secara manual.

**Asumsi 2**: Kita ingin total saldo = cash di drawer (shift aktif) + total kas manual + saldo di akun-akun.

**Asumsi 3**: Untuk menghindari double counting, kita tidak menghitung shift yang sudah selesai karena diasumsikan sudah dipindah ke kas/akun.

## Implementasi Plan

### 1. Buat Hook Baru: `useTotalSaldo.ts`

```typescript
export function useTotalSaldo() {
  const [loading, setLoading] = useState(true);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [breakdown, setBreakdown] = useState({
    drawer: 0,        // Cash di shift aktif
    kasManual: 0,     // Akumulasi kas masuk-keluar
    akunBank: 0,      // Saldo di akun bank
    akunEwallet: 0,   // Saldo di e-wallet
    akunKasFisik: 0,  // Saldo di kas fisik lain
  });

  const fetchTotalSaldo = async () => {
    // 1. Cash di drawer (shift aktif)
    const { data: activeShift } = await supabase
      .from('shift')
      .select('modal_awal, id')
      .eq('aktif', true)
      .single();
    
    let drawerCash = 0;
    if (activeShift) {
      const { data: shiftTransaksi } = await supabase
        .from('transaksi')
        .select('total')
        .eq('shift_id', activeShift.id)
        .eq('metode_pembayaran', 'tunai');
      
      const totalPenjualanTunai = shiftTransaksi?.reduce((s, t) => s + t.total, 0) || 0;
      drawerCash = activeShift.modal_awal + totalPenjualanTunai;
    }

    // 2. Kas manual (sudah ada di useKas)
    const { data: kasData } = await supabase.from('kas').select('tipe, nominal');
    const kasMasuk = kasData?.filter(k => k.tipe === 'masuk').reduce((s, k) => s + k.nominal, 0) || 0;
    const kasKeluar = kasData?.filter(k => k.tipe === 'keluar').reduce((s, k) => s + k.nominal, 0) || 0;
    const kasManual = kasMasuk - kasKeluar;

    // 3. Saldo per akun
    const { data: akunList } = await supabase
      .from('akun')
      .select('id, tipe')
      .eq('aktif', true);
    
    const akunSaldo = { bank: 0, ewallet: 0, kas_fisik: 0 };
    
    for (const akun of akunList || []) {
      // Masuk ke akun ini
      const { data: masuk } = await supabase
        .from('kas')
        .select('nominal')
        .eq('tipe', 'masuk')
        .eq('tujuan_akun_id', akun.id);
      
      // Keluar dari akun ini
      const { data: keluar } = await supabase
        .from('kas')
        .select('nominal')
        .eq('tipe', 'keluar')
        .eq('sumber_akun_id', akun.id);
      
      const saldo = 
        (masuk?.reduce((s, k) => s + k.nominal, 0) || 0) -
        (keluar?.reduce((s, k) => s + k.nominal, 0) || 0);
      
      if (akun.tipe === 'bank') akunSaldo.bank += saldo;
      else if (akun.tipe === 'ewallet') akunSaldo.ewallet += saldo;
      else if (akun.tipe === 'kas_fisik') akunSaldo.kas_fisik += saldo;
    }

    const breakdown = {
      drawer: drawerCash,
      kasManual,
      akunBank: akunSaldo.bank,
      akunEwallet: akunSaldo.ewallet,
      akunKasFisik: akunSaldo.kas_fisik,
    };

    const total = drawerCash + kasManual + akunSaldo.bank + akunSaldo.ewallet + akunSaldo.kas_fisik;
    
    setBreakdown(breakdown);
    setTotalSaldo(total);
    setLoading(false);
  };

  useEffect(() => { fetchTotalSaldo(); }, []);

  return { totalSaldo, breakdown, loading, refresh: fetchTotalSaldo };
}
```

### 2. Update Dashboard (dashboard/page.tsx)

**Tambah card "Total Saldo" di bagian "Ringkasan Keuangan"**:

```tsx
import { useTotalSaldo } from '@/hooks/useTotalSaldo';

function DashboardPage() {
  const { totalSaldo, breakdown, loading: loadingSaldo } = useTotalSaldo();
  
  // ... existing code ...
  
  // Di section "Ringkasan Keuangan", tambah card pertama:
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
    {/* Card baru - Total Saldo */}
    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-1.5 mb-1">
        <Wallet size={14} className="text-purple-600" />
        <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase">Total Saldo</span>
      </div>
      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
        {formatRupiah(totalSaldo)}
      </p>
      <p className="text-[10px] text-purple-500">Drawer + Kas + Akun</p>
    </div>
    
    {/* Existing cards: Kas Masuk, Kas Keluar, Bersih, Tunai, QRIS */}
    {/* ... */}
  </div>
  
  {/* Optional: Breakdown detail */}
  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
    <div className="flex justify-between py-1 px-2 th-surface rounded">
      <span className="th-text-secondary">Drawer</span>
      <span className="font-semibold th-text">{formatRupiah(breakdown.drawer)}</span>
    </div>
    <div className="flex justify-between py-1 px-2 th-surface rounded">
      <span className="th-text-secondary">Kas Manual</span>
      <span className="font-semibold th-text">{formatRupiah(breakdown.kasManual)}</span>
    </div>
    <div className="flex justify-between py-1 px-2 th-surface rounded">
      <span className="th-text-secondary">Bank</span>
      <span className="font-semibold th-text">{formatRupiah(breakdown.akunBank)}</span>
    </div>
    <div className="flex justify-between py-1 px-2 th-surface rounded">
      <span className="th-text-secondary">E-Wallet</span>
      <span className="font-semibold th-text">{formatRupiah(breakdown.akunEwallet)}</span>
    </div>
    <div className="flex justify-between py-1 px-2 th-surface rounded">
      <span className="th-text-secondary">Kas Fisik Lain</span>
      <span className="font-semibold th-text">{formatRupiah(breakdown.akunKasFisik)}</span>
    </div>
  </div>
}
```

### 3. Update Kas Page (kas/page.tsx)

**Di tab "overview", tambah card "Total Saldo" sebagai card pertama**:

```tsx
import { useTotalSaldo } from '@/hooks/useTotalSaldo';

function KasPage() {
  const { totalSaldo, breakdown } = useTotalSaldo();
  
  // Di tab overview, section "Dashboard Keuangan":
  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
    {/* Card baru - Total Saldo (paling kiri) */}
    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase mb-1">Total Saldo</p>
      <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{formatRupiah(totalSaldo)}</p>
      <p className="text-[10px] text-purple-500 mt-1">Semua sumber dana</p>
    </div>
    
    {/* Existing: Total Kas, Opex, Hutang, Cicilan, Sisa Bersih */}
    {/* ... */}
  </div>
  
  {/* Tambah breakdown detail di bawah */}
  <div className="th-card border th-border rounded-2xl p-4 md:p-5 shadow-sm mt-4">
    <h3 className="text-xs md:text-sm font-bold th-text mb-3">Rincian Total Saldo</h3>
    <div className="space-y-2 text-sm">
      <div className="flex justify-between py-1.5 border-b th-border/30">
        <span className="th-text-secondary">💰 Drawer (Shift Aktif)</span>
        <span className="font-semibold text-success">{formatRupiah(breakdown.drawer)}</span>
      </div>
      <div className="flex justify-between py-1.5 border-b th-border/30">
        <span className="th-text-secondary">📝 Kas Manual (Akumulasi)</span>
        <span className="font-semibold th-text">{formatRupiah(breakdown.kasManual)}</span>
      </div>
      <div className="flex justify-between py-1.5 border-b th-border/30">
        <span className="th-text-secondary">🏦 Bank</span>
        <span className="font-semibold th-text">{formatRupiah(breakdown.akunBank)}</span>
      </div>
      <div className="flex justify-between py-1.5 border-b th-border/30">
        <span className="th-text-secondary">📱 E-Wallet</span>
        <span className="font-semibold th-text">{formatRupiah(breakdown.akunEwallet)}</span>
      </div>
      <div className="flex justify-between py-1.5 border-b th-border/30">
        <span className="th-text-secondary">💵 Kas Fisik Lain</span>
        <span className="font-semibold th-text">{formatRupiah(breakdown.akunKasFisik)}</span>
      </div>
      <div className="flex justify-between py-2 pt-3 border-t-2 th-border">
        <span className="font-bold th-text">Total Saldo</span>
        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatRupiah(totalSaldo)}</span>
      </div>
    </div>
  </div>
}
```

### 4. Update useKas Hook (optional)

Tambahkan method untuk refresh total saldo setelah tambah/hapus kas:

```typescript
// Di useKas.ts
import { useTotalSaldo } from './useTotalSaldo';

export function useKas() {
  // existing code...
  
  // Expose refresh method untuk dipanggil dari luar
  const refreshAll = useCallback(() => {
    fetchKas();
    fetchTotalKasAll();
    // Trigger refresh total saldo juga jika perlu
  }, [fetchKas, fetchTotalKasAll]);
  
  return {
    // ... existing
    refreshAll,
  };
}
```

## Pertimbangan Implementasi

### Double Counting Prevention

**Masalah potensial**: 
- Jika kasir tutup shift dan uang drawer dipindah ke kas/bank via kas entry, bisa terjadi double count
- Contoh: Shift punya Rp 500k tunai → tutup shift → kasir catat "Kas Masuk Rp 500k dari drawer"
- Hasil: Total saldo = 500k (drawer) + 500k (kas entry) = 1 juta (salah!)

**Solusi**:
1. Hanya hitung shift yang **aktif** (belum ditutup)
2. Asumsikan setelah shift ditutup, uang sudah dipindah dan tercatat di kas/akun
3. Atau, tambah kategori kas khusus "Penarikan Kasir" yang TIDAK dihitung dalam total (sudah ada di KATEGORI_KAS)

### Performance

Jika data transaksi dan kas banyak:
- Hook `useTotalSaldo` melakukan banyak query
- Pertimbangkan caching atau aggregate table
- Atau buat materialized view di Supabase

### Data Consistency

Tidak ada foreign key antara kas dan transaksi, jadi:
- User bisa lupa mencatat pemindahan uang drawer ke kas
- Hasil total saldo bisa tidak akurat jika manual entry tidak disiplin
- Pertimbangkan otomasi: saat tutup shift, tawarkan auto-create kas entry

## Testing Checklist

- [ ] Test dengan shift aktif ada uang
- [ ] Test dengan shift tidak aktif (total drawer = 0)
- [ ] Test dengan kas manual positif/negatif
- [ ] Test dengan akun kosong (tidak ada transaksi)
- [ ] Test dengan akun ada saldo
- [ ] Verifikasi tidak ada double counting saat tutup shift + kas entry
- [ ] Test performance dengan data banyak

## Migration & Database Changes

Tidak ada perubahan schema diperlukan. Semua data sudah ada.

## UI/UX Improvements

1. **Loading state**: Tampilkan skeleton saat fetch data
2. **Refresh button**: User bisa manual refresh total saldo
3. **Tooltip**: Jelaskan apa itu "Total Saldo" dan komponennya
4. **Color coding**: Gunakan warna berbeda untuk setiap sumber dana

## Alternative Approach (Simpler)

Jika user tidak perlu breakdown detail per akun:

```typescript
// Simplified version
export function useTotalSaldo() {
  const [totalSaldo, setTotalSaldo] = useState(0);
  
  const fetchTotalSaldo = async () => {
    // 1. Drawer (shift aktif)
    const drawerCash = await getActiveShiftCash();
    
    // 2. Total kas (sudah ada dari useKas)
    const { totalKasAll } = useKas();
    
    // 3. Tidak track per akun, langsung total
    setTotalSaldo(drawerCash + totalKasAll);
  };
  
  return { totalSaldo, refresh: fetchTotalSaldo };
}
```

## Next Steps

1. **Konfirmasi dengan user** tentang asumsi dan skenario bisnis
2. Buat `useTotalSaldo` hook
3. Update Dashboard page
4. Update Kas page
5. Testing
6. Deploy

## Questions for User

1. Apakah uang dari shift drawer otomatis dipindah ke kas/bank saat tutup shift?
2. Apakah perlu tracking saldo per akun atau cukup total keseluruhan?
3. Apakah ada skenario lain yang perlu dipertimbangkan?
4. Apakah perlu notifikasi jika saldo rendah atau tidak sinkron?
