"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { Transaksi } from "@/lib/types";

interface Props {
  transaksi: Transaksi;
  onSave: (id: string, bayar: number, metode: "tunai" | "qris") => Promise<{ error: any }>;
  onClose: () => void;
}

export default function EditTransaksiModal({ transaksi, onSave, onClose }: Props) {
  const [bayar, setBayar] = useState(String(transaksi.bayar));
  const [metode, setMetode] = useState<"tunai" | "qris">(transaksi.metode_bayar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bayarNum = parseInt(bayar.replace(/[^0-9]/g, ""), 10) || 0;
  const kembalianBaru = bayarNum - transaksi.total;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bayarNum < transaksi.total) {
      setError("Bayar tidak boleh kurang dari total");
      return;
    }
    setLoading(true);
    const { error: err } = await onSave(transaksi.id, bayarNum, metode);
    if (err) {
      setError("Gagal menyimpan perubahan");
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="th-card border th-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b th-border">
          <h2 className="text-lg font-bold th-text">Edit Transaksi</h2>
          <button onClick={onClose} className="p-2 th-muted hover:th-text"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3 text-center">
            <p className="text-xs th-muted">Total Transaksi</p>
            <p className="text-xl font-bold th-accent">{formatRupiah(transaksi.total)}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Metode Bayar</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMetode("tunai")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  metode === "tunai"
                    ? "th-accent-bg text-white"
                    : "th-card border th-border th-muted hover:th-text"
                }`}
              >
                Tunai
              </button>
              <button
                type="button"
                onClick={() => setMetode("qris")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  metode === "qris"
                    ? "th-accent-bg text-white"
                    : "th-card border th-border th-muted hover:th-text"
                }`}
              >
                QRIS
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Bayar (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={bayar}
              onChange={(e) => { setBayar(e.target.value); setError(""); }}
              className="w-full px-4 py-3 th-card border th-border rounded-xl text-xl font-bold th-text focus:outline-none focus:border-accent text-center"
              autoFocus
            />
          </div>

          <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 text-center">
            <p className="text-xs th-muted">Kembalian</p>
            <p className={`text-xl font-bold ${
              kembalianBaru < 0 ? "text-danger" : "text-success"
            }`}>
              {formatRupiah(Math.abs(kembalianBaru))}
            </p>
          </div>

          {error && <p className="text-sm text-danger text-center">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">
              Batal
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">
              {loading ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
