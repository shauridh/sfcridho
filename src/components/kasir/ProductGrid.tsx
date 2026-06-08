"use client";

import { Produk } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";

interface Props {
  produk: Produk[];
  onAdd: (id: string) => void;
}

const KATEGORI_BADGE: Record<string, string> = {
  Ayam: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Geprek: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  Paket: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Minuman: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Tambahan: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

export default function ProductGrid({ produk, onAdd }: Props) {
  if (produk.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center th-muted">
        Tidak ada produk ditemukan.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2 md:gap-3">
        {produk.map((p) => {
          const badgeClass = KATEGORI_BADGE[p.kategori] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
          const hasImage = p.gambar && p.gambar.length > 0;

          return (
            <button
              key={p.id}
              onClick={() => onAdd(p.id)}
              className="th-card border th-border rounded-2xl overflow-hidden text-left transition-all active:scale-[0.97] hover:shadow-lg touch-target flex flex-col"
            >
              {hasImage ? (
                <div className="relative w-full h-20 sm:h-24 bg-gray-100 dark:bg-gray-800">
                  <img src={p.gambar!} alt={p.nama} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-full h-20 sm:h-24 th-surface flex items-center justify-center">
                  <span className="text-3xl opacity-30">
                    {p.kategori === "Ayam" ? "🍗" : p.kategori === "Minuman" ? "🥤" : p.kategori === "Geprek" ? "🌶️" : p.kategori === "Paket" ? "📦" : "🍽️"}
                  </span>
                </div>
              )}

              <div className="p-3 flex-1 flex flex-col">
                <span className={`inline-block self-start text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1.5 ${badgeClass}`}>
                  {p.kategori}
                </span>
                <div className="font-bold th-text text-sm leading-tight mb-auto min-h-[2.5rem] flex items-center">
                  {p.nama}
                </div>
                <div className="th-accent font-bold text-base mt-2">
                  {formatRupiah(p.harga)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
