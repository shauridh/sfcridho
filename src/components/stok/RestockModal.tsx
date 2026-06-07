"use client";

import { useState } from "react";
import { BahanBaku } from "@/lib/types";
import { tampilanStok, formatNumber } from "@/lib/utils";
import { X, ArrowRight } from "lucide-react";

interface Props {
  bahan: BahanBaku;
  onClose: () => void;
  onRestock: (jumlahBeli: number) => Promise<void>;
}

export default function RestockModal({ bahan, onClose, onRestock }: Props) {
  const [jumlahBeli, setJumlahBeli] = useState("");
  const [saving, setSaving] = useState(false);

  const jumlah = parseFloat(jumlahBeli) || 0;
  const tambahStok = jumlah * bahan.isi_per_pak;
  const stokBaru = bahan.stok + tambahStok;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (jumlah <= 0) return;
    setSaving(true);
    await onRestock(jumlah);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" >
      <div
        className="th-card border th-border rounded-2xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold th-text">Restock: {bahan.nama}</h2>
          <button onClick={onClose} className="p-2 th-muted hover:th-text rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="th-text-secondary">Stok saat ini:</span>
            <span className="font-semibold th-text">
              {tampilanStok(bahan.stok, bahan.sat_dasar, bahan.isi_per_pak, bahan.sat_beli)}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase tracking-wider mb-1.5">
              Jumlah Beli ({bahan.sat_beli})
            </label>
            <input
              type="number"
              value={jumlahBeli}
              onChange={(e) => setJumlahBeli(e.target.value)}
              min="0.1"
              step="any"
              required
              autoFocus
              className="w-full px-3 py-3 th-card border th-border rounded-xl text-lg th-text font-semibold focus:outline-none focus:border-accent text-center"
              placeholder="0"
            />
          </div>

          {jumlah > 0 && (
            <div className="bg-red-50/50 border border-border/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="th-text-secondary">Ditambahkan:</span>
                <span className="font-semibold text-success">
                  +{formatNumber(tambahStok)} {bahan.sat_dasar}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs th-muted">
                <span>
                  {jumlah} {bahan.sat_beli}
                </span>
                <ArrowRight size={14} />
                <span>
                  {formatNumber(tambahStok)} {bahan.sat_dasar}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                <span className="th-text-secondary">Stok setelah restock:</span>
                <span className="font-bold th-accent">
                  {tampilanStok(stokBaru, bahan.sat_dasar, bahan.isi_per_pak, bahan.sat_beli)}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              
              className="px-4 py-2.5 text-sm font-medium th-muted hover:th-text transition-colors touch-target"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || jumlah <= 0}
              className="px-6 py-2.5 bg-success text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-50 touch-target"
            >
              {saving ? "Menyimpan..." : "Konfirmasi Restock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


