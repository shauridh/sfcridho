"use client";

import { useState } from "react";
import { BahanBaku } from "@/lib/types";
import { tampilanStok } from "@/lib/utils";
import { ClipboardCheck, X } from "lucide-react";

interface Props {
  bahan: BahanBaku;
  onClose: () => void;
  onOpname: (jumlahAktual: number) => void;
}

export default function OpnameModal({ bahan, onClose, onOpname }: Props) {
  const [aktual, setAktual] = useState("");
  const [saving, setSaving] = useState(false);

  const val = parseInt(aktual.replace(/[^0-9]/g, ""), 10);
  const selisih = !isNaN(val) ? val - bahan.stok : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    await onOpname(val);
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" >
      <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b th-border">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={18} className="th-accent" />
            <h2 className="text-lg font-bold th-text">Stok Opname</h2>
          </div>
          <button onClick={onClose} className="p-2 th-muted hover:th-text"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium th-text">{bahan.nama}</p>
            <p className="text-xs th-muted mt-0.5">Stok sistem saat ini: <span className="font-semibold th-text">{tampilanStok(bahan.stok, bahan.sat_dasar, bahan.isi_per_pak, bahan.sat_beli)}</span></p>
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Jumlah Aktual ({bahan.sat_dasar})</label>
            <input
              type="text"
              inputMode="numeric"
              value={aktual}
              onChange={(e) => setAktual(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 th-card border th-border rounded-xl text-xl font-bold th-text focus:outline-none focus:border-accent text-center"
              placeholder="0"
            />
          </div>

          {selisih !== null && (
            <div className={`rounded-xl p-3 text-center border ${selisih === 0 ? "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700" : selisih > 0 ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"}`}>
              <p className="text-xs th-muted">Selisih</p>
              <p className={`text-xl font-bold ${selisih === 0 ? "th-text" : selisih > 0 ? "text-success" : "text-danger"}`}>
                {selisih > 0 ? "+" : ""}{selisih} {bahan.sat_dasar}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button"  className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
            <button type="submit" disabled={saving || isNaN(val) || val < 0} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">
              {saving ? "Menyimpan..." : "Simpan Opname"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


