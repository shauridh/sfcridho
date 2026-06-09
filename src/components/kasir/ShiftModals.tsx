"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/utils";
import { Shift } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Lock, Unlock, X, ArrowLeft, ArrowDownCircle } from "lucide-react";

interface OpenProps {
  onBuka: (uangBuka: number) => Promise<{ error: any }>;
  loading: boolean;
  lastUangDrawer?: number;
}

export function ShiftOpenModal({ onBuka, loading, lastUangDrawer = 0 }: OpenProps) {
  const router = useRouter();
  const [uangTambah, setUangTambah] = useState("");
  const [error, setError] = useState("");

  const tambah = parseInt(uangTambah.replace(/[^0-9]/g, ""), 10) || 0;
  const totalDrawer = lastUangDrawer + tambah;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalDrawer <= 0) { setError("Masukkan nominal uang drawer"); return; }
    const { error: err } = await onBuka(totalDrawer);
    if (err) setError("Gagal membuka shift");
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-40 p-4">
      <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-5 text-center border-b th-border">
          <div className="w-14 h-14 th-surface rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={24} className="th-accent" />
          </div>
          <h2 className="text-lg font-bold th-text">Buka Kasir</h2>
          <p className="text-sm th-text-secondary mt-1">Siapkan uang di laci kasir</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {lastUangDrawer > 0 && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase mb-1">Sisa Shift Sebelumnya</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatRupiah(lastUangDrawer)}</p>
              <p className="text-[10px] text-green-500 mt-1">Uang yang tersisa di drawer</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Tambah Uang (Rp)</label>
            <input type="text" inputMode="numeric" value={uangTambah} onChange={(e) => { setUangTambah(e.target.value); setError(""); }} autoFocus className="w-full px-4 py-3 th-card border th-border rounded-xl text-xl font-bold th-text focus:outline-none focus:border-accent text-center" placeholder="0" />
            <p className="text-xs th-muted mt-1">Nominal tambahan untuk dimasukkan ke laci</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 border th-border rounded-xl p-3 text-center">
            <p className="text-xs th-muted">Total Uang Drawer</p>
            <p className="text-xl font-bold th-accent">{formatRupiah(totalDrawer)}</p>
          </div>
          {error && <p className="text-sm text-danger text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3.5 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 transition-colors disabled:opacity-50 touch-target">
            {loading ? "Membuka..." : "Buka Kasir"}
          </button>
          <button type="button" onClick={() => router.push("/stok")} className="w-full py-3 border th-border rounded-xl text-sm font-medium th-muted hover:th-text transition-colors touch-target flex items-center justify-center gap-2">
            <ArrowLeft size={16} /> Kembali
          </button>
        </form>
      </div>
    </div>
  );
}

interface CloseProps {
  shift: Shift;
  totalTransaksiHariIni: number;
  totalNominalHariIni: number;
  totalQrisHariIni: number;
  onTutup: (uangAmbil: number, pengeluaran: number, omsetQris: number) => Promise<{ error: any }>;
  onClose: () => void;
  loading: boolean;
}

export function ShiftCloseModal({ shift, totalTransaksiHariIni, totalNominalHariIni, totalQrisHariIni, onTutup, onClose, loading }: CloseProps) {
  const [uangAmbil, setUangAmbil] = useState("");
  const [pengeluaran, setPengeluaran] = useState("");
  const [error, setError] = useState("");

  const uangDiDrawer = shift.uang_buka + totalNominalHariIni;
  const ambil = parseInt(uangAmbil.replace(/[^0-9]/g, ""), 10) || 0;
  const pengeluaranVal = parseInt(pengeluaran.replace(/[^0-9]/g, ""), 10) || 0;
  const omsetTotal = ambil + totalQrisHariIni;
  const sisaDrawer = uangDiDrawer - ambil - pengeluaranVal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ambil < 0 || ambil > uangDiDrawer) { setError("Nominal tidak valid"); return; }
    const { error: err } = await onTutup(ambil, pengeluaranVal, omsetTotal);
    if (err) setError("Gagal menutup shift");
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" >
      <div className="th-card border th-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b th-border">
          <div className="flex items-center gap-2">
            <Unlock size={20} className="th-accent" />
            <h2 className="text-lg font-bold th-text">Tutup Kasir</h2>
          </div>
          <button onClick={onClose} className="p-2 th-muted hover:th-text"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3">
              <p className="text-xs th-muted">Uang Buka</p>
              <p className="text-sm font-bold th-text">{formatRupiah(shift.uang_buka)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3">
              <p className="text-xs th-muted">Total Penjualan</p>
              <p className="text-sm font-bold text-success">{formatRupiah(totalNominalHariIni)}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3">
              <p className="text-xs th-muted">Jumlah Transaksi</p>
              <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{totalTransaksiHariIni}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">
              <p className="text-xs th-muted">Uang di Drawer</p>
              <p className="text-sm font-bold text-warning">{formatRupiah(uangDiDrawer)}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Pengeluaran Hari Ini (Rp)</label>
            <input type="text" inputMode="numeric" value={pengeluaran} onChange={(e) => { setPengeluaran(e.target.value); setError(""); }} className="w-full px-4 py-3 th-card border th-border rounded-xl text-xl font-bold th-text focus:outline-none focus:border-accent text-center" placeholder="0" />
            <p className="text-xs th-muted mt-1">Belanja kebutuhan dari drawer</p>
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">QRIS Masuk (Otomatis)</label>
            <div className="w-full px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border th-border rounded-xl text-xl font-bold text-blue-700 dark:text-blue-300 text-center">
              {formatRupiah(totalQrisHariIni)}
            </div>
            <p className="text-xs th-muted mt-1">Akan masuk ke akun Seabank otomatis</p>
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Uang yang Diambil (Rp)</label>
            <input type="text" inputMode="numeric" value={uangAmbil} onChange={(e) => { setUangAmbil(e.target.value); setError(""); }} autoFocus className="w-full px-4 py-3 th-card border th-border rounded-xl text-xl font-bold th-text focus:outline-none focus:border-accent text-center" placeholder="0" />
          </div>

          {omsetTotal > 0 && (
            <div className="bg-green-50 dark:bg-green-950/30 border th-border rounded-xl p-3 text-center">
              <p className="text-xs th-muted">Omset Harian (Auto)</p>
              <p className="text-xl font-bold text-success">{formatRupiah(omsetTotal)}</p>
              <p className="text-[10px] text-green-500 mt-1">{formatRupiah(ambil)} + {formatRupiah(totalQrisHariIni)} (QRIS)</p>
            </div>
          )}

          {(ambil > 0 || pengeluaranVal > 0) && (
            <div className="bg-red-50 dark:bg-red-950/30 border th-border rounded-xl p-3 text-center">
              <p className="text-xs th-muted">Sisa di Drawer</p>
              <p className="text-xl font-bold th-accent">{formatRupiah(sisaDrawer)}</p>
              <p className="text-[10px] text-red-500 mt-1">Untuk kembalian besok</p>
            </div>
          )}

          {error && <p className="text-sm text-danger text-center">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">
              {loading ? "Menutup..." : "Tutup Kasir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


