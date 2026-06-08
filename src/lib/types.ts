export interface BahanBaku {
  id: string;
  nama: string;
  kategori: string;
  sat_beli: string;
  isi_per_pak: number;
  sat_dasar: string;
  stok: number;
  stok_goreng: number;
  reorder_point: number;
  harga_beli: number;
  avg_daily: number;
  resep_goreng: { bahan_id: string; qty_per_kantong: number }[];
  created_at: string;
}

export interface ForecastItem extends BahanBaku {
  avgDaily: number;
  daysRemaining: number;
  stockNeeded7d: number;
  reorderQty: number;
}

export interface WeeklyForecastItem {
  id: string;
  nama: string;
  kategori: string;
  sat_beli: string;
  sat_dasar: string;
  isi_per_pak: number;
  harga_beli: number;
  stokBeli: number;
  avgDailyBeli: number;
  daysRemaining: number;
  orderByDate: Date;
  reorderQtyBeli: number;
  estHarga: number;
  isUrgent: boolean;
  recommendedReorderPoint: number;
  recommendedReorderPointBeli: number;
}

export interface Kategori {
  id: string;
  nama: string;
  tipe: "stok" | "produk";
  urutan: number;
  created_at: string;
}

export interface Order {
  id: string;
  nama: string;
  phone: string;
  alamat: string | null;
  items: { nama: string; qty: number; harga: number; subtotal: number }[];
  catatan: string | null;
  subtotal: number | null;
  ongkir: number | null;
  total: number;
  status: "pending" | "confirmed" | "paid" | "done" | "cancelled" | "unavailable";
  qris_string: string | null;
  confirm_token: string;
  location_url: string | null;
  available_items: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface Produk {
  id: string;
  nama: string;
  kategori: string;
  harga: number;
  aktif: boolean;
  gambar: string | null;
  created_at: string;
}

export interface Resep {
  id: string;
  produk_id: string;
  bahan_id: string;
  qty: number;
  sat: string;
}

export interface Transaksi {
  id: string;
  waktu: string;
  total: number;
  bayar: number;
  kembalian: number;
  metode_bayar: "tunai" | "qris";
}

export interface TransaksiItem {
  id: string;
  transaksi_id: string;
  produk_id: string;
  nama_snapshot: string;
  harga: number;
  qty: number;
}

export interface StokLog {
  id: string;
  bahan_id: string;
  tipe: "deduct" | "restock" | "adjust";
  qty: number;
  referensi: string;
  waktu: string;
}

export interface Addon {
  id: string;
  nama: string;
  harga: number;
  aktif: boolean;
  created_at: string;
}

export interface CartItem {
  produk: Produk;
  qty: number;
  addons?: { id: string; nama: string; harga: number }[];
}

export type StokStatus = "aman" | "rendah" | "kritis" | "habis";

export function getStokStatus(stok: number, reorderPoint: number): StokStatus {
  if (stok <= 0) return "habis";
  if (stok <= reorderPoint * 0.5) return "kritis";
  if (stok <= reorderPoint) return "rendah";
  return "aman";
}

export function getStokColor(status: StokStatus): string {
  switch (status) {
    case "aman":
      return "text-success";
    case "rendah":
      return "text-warning";
    case "kritis":
      return "text-danger";
    case "habis":
      return "text-danger";
  }
}

export function getStokBgColor(status: StokStatus): string {
  switch (status) {
    case "aman":
      return "bg-success/10";
    case "rendah":
      return "bg-warning/10";
    case "kritis":
      return "bg-danger/10";
    case "habis":
      return "bg-danger/20";
  }
}

export const KATEGORI_BAHAN = [
  "Ayam",
  "Tepung & Bumbu",
  "Minyak",
  "Nasi & Karbohidrat",
  "Minuman",
  "Kemasan",
  "Lainnya",
] as const;

export const KATEGORI_PRODUK = [
  "Ayam",
  "Geprek",
  "Paket",
  "Minuman",
  "Tambahan",
  "Lainnya",
] as const;

export const SATUAN_OPTIONS = {
  berat: ["kg", "gram", "ons"],
  volume: ["liter", "ml", "jerigen", "botol", "gelas"],
  kemasan: ["pak", "pouch", "pack", "sachet", "karung", "karton", "lusin"],
  satuan: ["pcs", "potong", "ekor", "buah"],
} as const;

export const SATUAN_LABELS: Record<keyof typeof SATUAN_OPTIONS, string> = {
  berat: "Berat",
  volume: "Volume",
  kemasan: "Kemasan",
  satuan: "Satuan",
};

export interface Kas {
  id: string;
  tipe: "masuk" | "keluar";
  nominal: number;
  keterangan: string;
  kategori: string;
  waktu: string;
  sumber_akun_id: string | null;
  tujuan_akun_id: string | null;
}

export interface Shift {
  id: string;
  buka_at: string;
  tutup_at: string | null;
  uang_buka: number;
  uang_drawer: number | null;
  uang_ambil: number | null;
  total_transaksi: number;
  total_nominal: number;
  status: "open" | "closed";
}

export const KATEGORI_KAS = [
  "Operasional",
  "Bahan Baku",
  "Gaji",
  "Utilitas",
  "Transport",
  "Maintenance",
  "Penarikan Kasir",
  "Lainnya",
] as const;

export interface AppUser {
  id: string;
  username: string;
  nama: string;
  role: "owner" | "kasir";
  aktif: boolean;
}

export interface Settings {
  store_name: string;
  wa_api_key: string;
  wa_phone: string;
  wa_sender: string;
  wa_auto_send: string;
  daily_target: string;
}

export interface Opex {
  id: string;
  nama: string;
  nominal: number;
  frekuensi: string;
  jatuh_tempo: number | null;
  aktif: boolean;
  created_at: string;
}

export interface Piutang {
  id: string;
  pihak: string;
  nominal: number;
  tipe: "hutang" | "piutang";
  keterangan: string | null;
  status: "belum" | "lunas";
  jatuh_tempo: string | null;
  tenor: number | null;
  cicilan: number | null;
  bunga: number | null;
  created_at: string;
}

export interface Akun {
  id: string;
  nama: string;
  tipe: "bank" | "ewallet" | "kas_fisik";
  warna: string;
  aktif: boolean;
  created_at: string;
}

export const TIPE_AKUN_OPTIONS = [
  { value: "kas_fisik", label: "Kas Fisik" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-Wallet" },
] as const;
