"use client";

import { useState, useEffect } from "react";
import { formatRupiah } from "@/lib/utils";
import { getSettings } from "@/lib/whatsapp";
import { convertQRIS } from "@/lib/qris";
import { X, Banknote, QrCode, Loader2 } from "lucide-react";


interface Props {
  total: number;
  onClose: () => void;
  onBayar: (bayar: number, metode: "tunai" | "qris") => Promise<{ error: any; transaksiId: string | null }>;
  loading: boolean;
}

const NOMINAL_CEPAT = [5000, 10000, 20000, 50000, 100000];

export default function PaymentModal({ total, onClose, onBayar, loading }: Props) {
  const [metode, setMetode] = useState<"tunai" | "qris" | null>(null);
  const [bayar, setBayar] = useState("");
  const [error, setError] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");

  const nominal = parseInt(bayar.replace(/[^0-9]/g, ""), 10) || 0;
  const kembalian = nominal - total;
  const cukup = nominal >= total;

  const handleNominalCepat = (nilai: number) => { setBayar(nilai.toString()); setError(""); };
  const handlePas = () => { setBayar(Math.ceil(total / 1000) * 1000 + ""); setError(""); };

  useEffect(() => {
    if (metode !== "qris") return;
    let cancelled = false;
    const generate = async () => {
      setQrLoading(true);
      setQrError("");
      setQrImage(null);
      try {
        const settings = await getSettings();
        const staticQris = settings.qris_string;
        if (!staticQris) {
          setQrError("QRIS belum dikonfigurasi di Pengaturan");
          setQrLoading(false);
          return;
        }
        const dynamicQris = convertQRIS(staticQris, { amount: total });
        const QRCodeLib = await import("qrcode");
        const dataUrl = await QRCodeLib.default.toDataURL(dynamicQris, {
          width: 256,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
        if (!cancelled) setQrImage(dataUrl);
      } catch (err: any) {
        if (!cancelled) setQrError(err.message || "Gagal generate QRIS");
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    };
    generate();
    return () => { cancelled = true; };
  }, [metode, total]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (metode === "qris") {
      const { error: txError } = await onBayar(total, "qris");
      if (txError) setError("Gagal memproses transaksi");
      return;
    }
    if (!cukup) { setError("Nominal kurang dari total"); return; }
    const { error: txError } = await onBayar(nominal, "tunai");
    if (txError) setError("Gagal memproses transaksi");
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" >
      <div className="th-card border th-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b th-border">
          <h2 className="text-lg font-bold th-text">Pembayaran</h2>
          <button onClick={onClose} className="p-2 th-muted hover:th-text rounded-lg"><X size={20} /></button>
        </div>

        {!metode ? (
          <div className="p-5 space-y-3">
            <p className="text-center text-sm th-text-secondary mb-2">Total: <span className="font-bold th-accent text-lg">{formatRupiah(total)}</span></p>
            <button onClick={() => setMetode("tunai")} className="w-full flex items-center gap-3 p-4 th-card border th-border rounded-xl hover:border-accent transition-colors touch-target">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-950/30 rounded-lg flex items-center justify-center"><Banknote size={20} className="text-success" /></div>
              <div className="text-left"><p className="font-bold th-text">Tunai</p><p className="text-xs th-text-secondary">Bayar dengan uang cash</p></div>
            </button>
            <button onClick={() => setMetode("qris")} className="w-full flex items-center gap-3 p-4 th-card border th-border rounded-xl hover:border-accent transition-colors touch-target">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-lg flex items-center justify-center"><QrCode size={20} className="text-blue-600 dark:text-blue-400" /></div>
              <div className="text-left"><p className="font-bold th-text">QRIS</p><p className="text-xs th-text-secondary">Scan QR code dari e-wallet / mBanking</p></div>
            </button>
          </div>
        ) : metode === "qris" ? (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-center">
            <div className="w-64 h-64 mx-auto rounded-xl flex items-center justify-center border th-border overflow-hidden bg-white">
              {qrLoading ? (
                <Loader2 size={32} className="animate-spin th-muted" />
              ) : qrImage ? (
                <img src={qrImage} alt="QRIS" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="p-4 text-center">
                  <QrCode size={48} className="th-muted mx-auto mb-2" />
                  <p className="text-xs text-danger">{qrError || "Gagal generate QR"}</p>
                </div>
              )}
            </div>
            <p className="text-sm th-text-secondary">Total yang harus dibayar</p>
            <p className="text-3xl font-bold th-accent">{formatRupiah(total)}</p>
            <p className="text-xs th-muted">Scan QR di atas dari aplikasi e-wallet / mBanking</p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-success text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">
              {loading ? "Memproses..." : "Sudah Dibayar"}
            </button>
            <button type="button" onClick={() => { setMetode(null); setQrImage(null); setQrError(""); }} className="text-xs th-muted hover:th-text">← Ganti metode</button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="text-center">
              <p className="text-sm th-text-secondary mb-1">Total yang harus dibayar</p>
              <p className="text-3xl font-bold th-accent">{formatRupiah(total)}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold th-muted uppercase tracking-wider mb-1.5">Nominal Bayar (Rp)</label>
              <input type="text" inputMode="numeric" value={bayar} onChange={(e) => { setBayar(e.target.value); setError(""); }} autoFocus className="w-full px-4 py-3 th-card border th-border rounded-xl text-xl font-bold th-text focus:outline-none focus:border-accent text-center" placeholder="0" />
            </div>
            <div className="flex flex-wrap gap-2">
              {NOMINAL_CEPAT.map((n) => (
                <button key={n} type="button" onClick={() => handleNominalCepat(n)} className="flex-1 min-w-[70px] py-2.5 th-card border th-border rounded-xl text-xs font-semibold th-text-secondary hover:th-text hover:border-accent/30 transition-colors touch-target">{formatRupiah(n)}</button>
              ))}
              <button type="button" onClick={handlePas} className="flex-1 min-w-[70px] py-2.5 bg-red-50 dark:bg-red-950/40 border th-border rounded-xl text-xs font-semibold th-accent hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors touch-target">Pas</button>
            </div>
            {nominal > 0 && (
              <div className={`rounded-xl p-4 text-center ${cukup ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"}`}>
                <p className="text-xs th-text-secondary mb-1">{cukup ? "Kembalian" : "Kurang"}</p>
                <p className={`text-2xl font-bold ${cukup ? "text-success" : "text-danger"}`}>{formatRupiah(Math.abs(kembalian))}</p>
              </div>
            )}
            {error && <p className="text-sm text-danger text-center">{error}</p>}
            <button type="submit" disabled={!cukup || loading} className="w-full py-3.5 bg-success text-white rounded-xl font-bold text-base hover:opacity-90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed touch-target">
              {loading ? "Memproses..." : "Proses Pembayaran"}
            </button>
            <button type="button" onClick={() => setMetode(null)} className="w-full text-xs th-muted hover:th-text text-center">← Ganti metode</button>
          </form>
        )}
      </div>
    </div>
  );
}



