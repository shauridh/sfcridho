"use client";

import { useState } from "react";
import { Produk, Resep, BahanBaku } from "@/lib/types";
import { X, Plus, Trash2, ImagePlus } from "lucide-react";

interface ResepItem {
  bahan_id: string;
  qty: number;
  sat: string;
}

interface Props {
  initial: Produk | null;
  resepInitial: Resep[];
  bahanBaku: BahanBaku[];
  kategoriOptions: string[];
  onUploadGambar?: (file: File) => Promise<string | null>;
  onClose: () => void;
  onSave: (
    data: Omit<Produk, "id" | "created_at">,
    resep: Omit<Resep, "id" | "produk_id">[]
  ) => Promise<void>;
}

export default function ProdukForm({ initial, resepInitial, bahanBaku, kategoriOptions, onUploadGambar, onClose, onSave }: Props) {
  const [nama, setNama] = useState(initial?.nama || "");
  const [kategori, setKategori] = useState(initial?.kategori || "Lainnya");
  const [harga, setHarga] = useState(initial?.harga?.toString() || "");
  const [gambar, setGambar] = useState<string | null>(initial?.gambar || null);
  const [uploading, setUploading] = useState(false);
  const [resepItems, setResepItems] = useState<ResepItem[]>(
    resepInitial.length > 0
      ? resepInitial.map((r) => ({ bahan_id: r.bahan_id, qty: r.qty, sat: r.sat || "" }))
      : []
  );
  const [saving, setSaving] = useState(false);

  const addResepItem = () => {
    setResepItems([...resepItems, { bahan_id: "", qty: 0, sat: "" }]);
  };

  const removeResepItem = (index: number) => {
    setResepItems(resepItems.filter((_, i) => i !== index));
  };

  const updateResepItem = (index: number, field: keyof ResepItem, value: string | number) => {
    const updated = [...resepItems];
    if (field === "bahan_id") {
      const bahan = bahanBaku.find((b) => b.id === value);
      updated[index] = {
        ...updated[index],
        bahan_id: value as string,
        sat: bahan?.sat_dasar || "",
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setResepItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const validResep = resepItems.filter((r) => r.bahan_id && r.qty > 0);
    await onSave(
      { nama, kategori, harga: parseInt(harga) || 0, aktif: initial?.aktif ?? true, gambar },
      validResep.map((r) => ({ bahan_id: r.bahan_id, qty: r.qty, sat: r.sat }))
    );
    setSaving(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadGambar) return;
    setUploading(true);
    const url = await onUploadGambar(file);
    if (url) setGambar(url);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4">
      <div
        className="th-card border th-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-bold th-text">
            {initial ? "Edit Produk" : "Tambah Produk"}
          </h2>
          <button onClick={onClose} className="p-2 th-muted hover:th-text rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold th-muted uppercase tracking-wider mb-1.5">
              Nama Produk
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              required
              className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"
              placeholder="Contoh: Geprek Dada"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase tracking-wider mb-1.5">
              Foto Produk
            </label>
            <div className="flex items-center gap-3">
              {gambar ? (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                  <img src={gambar} alt={nama} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setGambar(null)} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-xs">×</button>
                </div>
              ) : (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors th-muted">
                  <ImagePlus size={20} />
                  <span className="text-[9px] mt-0.5">Upload</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              )}
              {uploading && <span className="text-xs th-muted">Mengupload...</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold th-muted uppercase tracking-wider mb-1.5">
                Kategori
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"
              >
                {kategoriOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold th-muted uppercase tracking-wider mb-1.5">
                Harga Jual (Rp)
              </label>
              <input
                type="number"
                value={harga}
                onChange={(e) => setHarga(e.target.value)}
                required
                min="0"
                className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"
                placeholder="15000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold th-muted uppercase tracking-wider">
                Resep (BOM)
              </label>
              <button
                type="button"
                onClick={addResepItem}
                className="flex items-center gap-1 text-xs th-accent hover:text-red-700 font-medium"
              >
                <Plus size={14} />
                Tambah Bahan
              </button>
            </div>

            {resepItems.length === 0 && (
              <p className="text-xs th-muted py-2">
                Belum ada resep. Klik &quot;Tambah Bahan&quot; untuk menambahkan.
              </p>
            )}

            {resepItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={item.bahan_id}
                  onChange={(e) => updateResepItem(idx, "bahan_id", e.target.value)}
                  className="flex-1 px-2.5 py-2 th-card border th-border rounded-lg text-xs th-text focus:outline-none focus:border-accent"
                >
                  <option value="">Pilih bahan...</option>
                  {bahanBaku.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nama} ({b.sat_dasar})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={item.qty || ""}
                  onChange={(e) => updateResepItem(idx, "qty", parseFloat(e.target.value) || 0)}
                  min="0"
                  step="any"
                  placeholder="Qty"
                  className="w-20 px-2.5 py-2 th-card border th-border rounded-lg text-xs th-text focus:outline-none focus:border-accent text-center"
                />
                <span className="text-xs th-muted w-12">{item.sat || "?"}</span>
                <button
                  type="button"
                  onClick={() => removeResepItem(idx)}
                  className="p-1.5 th-muted hover:text-danger rounded"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium th-muted hover:th-text transition-colors touch-target"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors disabled:opacity-50 touch-target"
            >
              {saving ? "Menyimpan..." : initial ? "Simpan Perubahan" : "Tambah Produk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
