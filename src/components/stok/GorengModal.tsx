"use client";

import { useState } from "react";
import { BahanBaku } from "@/lib/types";
import { X, Flame } from "lucide-react";

interface Props {
  bahan: BahanBaku;
  allBahan: BahanBaku[];
  onClose: () => void;
  onGoreng: (jumlahKantong: number) => Promise<any>;
}

export default function GorengModal({ bahan, allBahan, onClose, onGoreng }: Props) {
  const [jumlah, setJumlah] = useState("");
  const [saving, setSaving] = useState(false);

  const kantong = parseInt(jumlah) || 0;
  const potongHasil = kantong * bahan.isi_per_pak;
  const stokMentahCukup = bahan.stok >= potongHasil;

  const resep = (bahan.resep_goreng || []).map((item) => {
    const target = allBahan.find((b) => b.id === item.bahan_id);
    const dibutuhkan = kantong * item.qty_per_kantong;
    return { ...item, nama: target?.nama || "?", sat_dasar: target?.sat_dasar || "", stok: target?.stok || 0, dibutuhkan };
  });

  const semuaStokCukup = stokMentahCukup && resep.every((r) => r.stok >= r.dibutuhkan);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (kantong <= 0 || !semuaStokCukup) return;
    setSaving(true);
    await onGoreng(kantong);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4">
      <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between p-5 border-b th-border">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            <h2 className="text-lg font-bold th-text">Goreng Batch</h2>
          </div>
          <button onClick={onClose} className="p-2 th-muted hover:th-text"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium th-text">{bahan.nama}</p>
            <div className="flex gap-4 mt-1 text-xs th-muted">
              <span>Stok mentah: <b className="th-text">{bahan.stok} {bahan.sat_dasar}</b></span>
              <span>Stok goreng: <b className="text-orange-500">{bahan.stok_goreng || 0} {bahan.sat_dasar}</b></span>
            </div>
            <p className="text-xs th-muted mt-0.5">1 kantong = {bahan.isi_per_pak} {bahan.sat_dasar}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Jumlah Kantong</label>
            <input
              type="text"
              inputMode="numeric"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 th-card border th-border rounded-xl text-xl font-bold th-text focus:outline-none focus:border-accent text-center"
              placeholder="0"
            />
          </div>

          {kantong > 0 && (
            <div className={`rounded-xl p-3 border space-y-1.5 ${semuaStokCukup ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"}`}>
              <div className="flex justify-between text-sm">
                <span className="th-text-secondary">🍗 {bahan.nama} mentah</span>
                <span className="font-semibold th-text">−{potongHasil} {bahan.sat_dasar}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="th-text-secondary">🍗 {bahan.nama} goreng</span>
                <span className="font-semibold text-orange-500">+{potongHasil} {bahan.sat_dasar}</span>
              </div>

              {resep.length > 0 && (
                <div className="border-t th-border/50 pt-1.5 space-y-1">
                  <p className="text-[10px] font-semibold th-muted uppercase">Bahan terpakai</p>
                  {resep.map((r) => (
                    <div key={r.bahan_id} className="flex justify-between text-sm">
                      <span className="th-text-secondary">📦 {r.nama}</span>
                      <span className={r.stok >= r.dibutuhkan ? "font-semibold th-text" : "font-semibold text-danger"}>
                        −{r.dibutuhkan.toFixed(2)} {r.sat_dasar}
                        {r.stok < r.dibutuhkan && " ⚠️"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {!stokMentahCukup && (
                <p className="text-xs text-danger mt-1">Stok {bahan.nama} mentah tidak cukup!</p>
              )}
              {resep.some((r) => r.stok < r.dibutuhkan) && (
                <p className="text-xs text-danger mt-1">Stok bahan terkait tidak cukup!</p>
              )}
              {semuaStokCukup && (
                <div className="flex justify-between text-sm mt-1 pt-1 border-t th-border/50">
                  <span className="th-text-secondary">Sisa mentah</span>
                  <span className="font-semibold th-text">{bahan.stok - potongHasil} {bahan.sat_dasar}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
            <button type="submit" disabled={saving || kantong <= 0 || !semuaStokCukup} className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 touch-target">
              {saving ? "Memproses..." : "Goreng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
