"use client";

import { useState, useMemo } from "react";
import { BahanBaku, SATUAN_OPTIONS, SATUAN_LABELS } from "@/lib/types";
import { X, ArrowRight } from "lucide-react";

interface Props {
  initial: BahanBaku | null;
  kategoriOptions: string[];
  safetyDays: number;
  onClose: () => void;
  onSave: (data: Omit<BahanBaku, "id" | "created_at">) => Promise<void>;
}

function renderSatuanSelect(value: string, onChange: (v: string) => void, required: boolean, placeholder: string) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent">
      <option value="">{placeholder}</option>
      {Object.entries(SATUAN_OPTIONS).map(([key, options]) => (
        <optgroup key={key} label={SATUAN_LABELS[key as keyof typeof SATUAN_LABELS]}>
          {options.map((s) => <option key={s} value={s}>{s}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

export default function StokForm({ initial, kategoriOptions, safetyDays, onClose, onSave }: Props) {
  const [nama, setNama] = useState(initial?.nama || "");
  const [kategori, setKategori] = useState(initial?.kategori || kategoriOptions[0] || "Lainnya");
  const [satBeli, setSatBeli] = useState(initial?.sat_beli || "");
  const [isiPerPak, setIsiPerPak] = useState(initial?.isi_per_pak?.toString() || "");
  const [satDasar, setSatDasar] = useState(initial?.sat_dasar || "");
  const [stokAwalBeli, setStokAwalBeli] = useState(initial && initial.isi_per_pak > 0 ? (initial.stok / initial.isi_per_pak).toString() : "0");
  const [reorderPoint, setReorderPoint] = useState(initial?.reorder_point?.toString() || "");
  const [hargaBeli, setHargaBeli] = useState(initial?.harga_beli?.toString() || "");
  const [avgDaily, setAvgDaily] = useState(initial?.avg_daily?.toString() || "0");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const stokDasar = useMemo(() => {
    const beli = parseFloat(stokAwalBeli) || 0;
    const isi = parseFloat(isiPerPak) || 0;
    return Math.round(beli * isi * 100) / 100;
  }, [stokAwalBeli, isiPerPak]);

  const markDirty = () => setDirty(true);

  const handleClose = () => {
    if (dirty) {
      if (!window.confirm("Ada perubahan belum disimpan. Yakin tutup?")) return;
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      nama, kategori, sat_beli: satBeli,
      isi_per_pak: parseFloat(isiPerPak) || 0, sat_dasar: satDasar,
      stok: stokDasar, stok_goreng: initial?.stok_goreng || 0, reorder_point: parseFloat(reorderPoint) || 0,
      harga_beli: parseInt(hargaBeli) || 0, avg_daily: parseFloat(avgDaily) || 0,
      resep_goreng: initial?.resep_goreng || [],
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4">
      <div className="th-card border th-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold th-text">{initial ? "Edit Bahan Baku" : "Tambah Bahan Baku"}</h2>
          <button onClick={handleClose} className="p-2 th-muted hover:th-text rounded-lg"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Nama Bahan</label>
            <input type="text" value={nama} onChange={(e) => { setNama(e.target.value); markDirty(); }} required className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Contoh: Ayam Kampung" />
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Kategori</label>
            <select value={kategori} onChange={(e) => { setKategori(e.target.value); markDirty(); }} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent">
              {kategoriOptions.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Satuan Beli</label>
              {renderSatuanSelect(satBeli, (v) => { setSatBeli(v); markDirty(); }, true, "Pilih...")}
            </div>
            <div>
              <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Isi per Pak</label>
              <input type="number" value={isiPerPak} onChange={(e) => { setIsiPerPak(e.target.value); markDirty(); }} required min="0.01" step="any" className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="9" />
            </div>
            <div>
              <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Satuan Dasar</label>
              {renderSatuanSelect(satDasar, (v) => { setSatDasar(v); markDirty(); }, true, "Pilih...")}
            </div>
          </div>

          {isiPerPak && satBeli && satDasar && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs th-text-secondary">
              Konversi: 1 {satBeli} = {parseFloat(isiPerPak).toLocaleString("id-ID")} {satDasar}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Stok Awal ({satBeli || "sat beli"})</label>
              <input type="number" value={stokAwalBeli} onChange={(e) => { setStokAwalBeli(e.target.value); markDirty(); }} min="0" step="any" className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Reorder Pt ({satBeli || "sat beli"})</label>
              <input type="number" value={reorderPoint} onChange={(e) => { setReorderPoint(e.target.value); markDirty(); }} required min="0" step="any" className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="0" />
              {parseFloat(avgDaily) > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-[10px] th-muted">
                    💡 Rekomendasi: {Math.ceil(parseFloat(avgDaily) * safetyDays / (parseFloat(isiPerPak) || 1))} {satBeli || "?"} ({Math.ceil(parseFloat(avgDaily) * safetyDays)} {satDasar || "?"}, {safetyDays} hari)
                  </p>
                  <button type="button" onClick={() => { setReorderPoint(Math.ceil(parseFloat(avgDaily) * safetyDays / (parseFloat(isiPerPak) || 1)).toString()); markDirty(); }} className="text-[10px] th-accent font-semibold hover:underline">Gunakan</button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Harga Beli (Rp)</label>
              <input type="number" value={hargaBeli} onChange={(e) => { setHargaBeli(e.target.value); markDirty(); }} min="0" className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Avg/Hari ({satDasar || "sat dasar"})</label>
              <input type="number" value={avgDaily} onChange={(e) => { setAvgDaily(e.target.value); markDirty(); }} min="0" step="any" className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="0" />
              <p className="text-[10px] th-muted mt-0.5">Rata-rata pemakaian per hari (manual)</p>
            </div>
          </div>

          {parseFloat(stokAwalBeli) > 0 && parseFloat(isiPerPak) > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs">
              <span className="th-text-secondary">Konversi stok:</span>
              <span className="font-semibold th-text">{parseFloat(stokAwalBeli)} {satBeli || "?"}</span>
              <ArrowRight size={12} className="th-muted" />
              <span className="font-bold text-success">{stokDasar.toLocaleString("id-ID")} {satDasar || "?"}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={handleClose} className="px-4 py-2.5 text-sm font-medium th-muted hover:th-text transition-colors touch-target">Batal</button>
            <button type="submit" disabled={saving} className="px-6 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 touch-target">
              {saving ? "Menyimpan..." : initial ? "Simpan Perubahan" : "Tambah Bahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
