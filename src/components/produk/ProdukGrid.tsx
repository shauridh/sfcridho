"use client";

import { Produk, Resep, BahanBaku } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { Edit3, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useState } from "react";

interface Props {
  produk: Produk[];
  resepMap: Record<string, Resep[]>;
  bahanBaku: BahanBaku[];
  onEdit: (p: Produk) => void;
  onToggle: (id: string, aktif: boolean) => void;
  onDelete: (id: string) => void;
}

export default function ProdukGrid({ produk, resepMap, bahanBaku, onEdit, onToggle, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getBahanName = (bahanId: string) => {
    return bahanBaku.find((b) => b.id === bahanId)?.nama || "?";
  };

  if (produk.length === 0) {
    return (
      <div className="text-center py-12 th-muted">Tidak ada produk ditemukan.</div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {produk.map((p) => {
        const resep = resepMap[p.id] || [];

        return (
          <div
            key={p.id}
            className={`bg-white border rounded-2xl p-4 transition-all shadow-sm ${
              p.aktif ? "border-border hover:border-accent hover:shadow-md" : "border-border/50 opacity-60"
            }`}
          >
            {p.gambar && (
              <div className="mb-3 -mx-4 -mt-4 rounded-t-2xl overflow-hidden h-28">
                <img src={p.gambar} alt={p.nama} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-semibold th-accent uppercase tracking-wider px-2 py-0.5 bg-red-50 rounded-full border border-red-200">
                {p.kategori}
              </span>
              <button
                onClick={() => onToggle(p.id, !p.aktif)}
                className={`transition-colors ${p.aktif ? "text-success" : "th-muted"}`}
                title={p.aktif ? "Nonaktifkan" : "Aktifkan"}
              >
                {p.aktif ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
              </button>
            </div>

            <h3 className="font-bold th-text text-sm mb-1 leading-tight">{p.nama}</h3>
            <p className="th-accent font-bold text-lg mb-3">{formatRupiah(p.harga)}</p>

            {resep.length > 0 && (
              <div className="mb-3 space-y-0.5">
                {resep.slice(0, 3).map((r) => (
                  <div key={r.id} className="text-[10px] th-muted flex justify-between">
                    <span>{getBahanName(r.bahan_id)}</span>
                    <span>
                      {r.qty} {r.sat}
                    </span>
                  </div>
                ))}
                {resep.length > 3 && (
                  <div className="text-[10px] th-muted">+{resep.length - 3} bahan lain</div>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 pt-2 border-t border-border/50">
              <button
                onClick={() => onEdit(p)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs th-muted hover:th-accent rounded-lg hover:bg-red-50 transition-colors"
              >
                <Edit3 size={12} />
                Edit
              </button>
              {confirmDelete === p.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <button
                    onClick={() => {
                      onDelete(p.id);
                      setConfirmDelete(null);
                    }}
                    className="flex-1 py-1.5 bg-danger text-white rounded-lg text-xs font-medium"
                  >
                    Ya
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="flex-1 py-1.5 th-muted text-xs"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(p.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs th-muted hover:text-danger rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={12} />
                  Hapus
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
