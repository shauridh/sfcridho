"use client";

import { BahanBaku, ForecastItem, getStokStatus, getStokColor, getStokBgColor } from "@/lib/types";
import { tampilanStok, formatRupiah } from "@/lib/utils";
import { Edit3, PlusCircle, Trash2, ClipboardCheck, Flame } from "lucide-react";
import { useState } from "react";

interface Props {
  bahanBaku: BahanBaku[];
  forecast: ForecastItem[];
  onEdit: (b: BahanBaku) => void;
  onRestock: (b: BahanBaku) => void;
  onOpname: (b: BahanBaku) => void;
  onGoreng: (b: BahanBaku) => void;
  onDelete: (id: string) => void;
}

export default function StokTable({ bahanBaku, forecast, onEdit, onRestock, onOpname, onGoreng, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const forecastMap = new Map(forecast.map((f) => [f.id, f]));

  const sorted = [...bahanBaku].sort((a, b) => {
    const fa = forecastMap.get(a.id);
    const fb = forecastMap.get(b.id);
    const da = fa?.daysRemaining ?? Infinity;
    const db = fb?.daysRemaining ?? Infinity;
    if (da !== db) return da - db;
    const order = { habis: 0, kritis: 1, rendah: 2, aman: 3 };
    return order[getStokStatus(a.stok, a.reorder_point)] - order[getStokStatus(b.stok, b.reorder_point)];
  });

  return (
    <div className="th-card rounded-2xl border th-border overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b th-border text-left bg-red-50/50 dark:bg-red-950/20">
              {["Nama", "Kategori", "Stok", "Avg/Hari", "Cukup", "7 Hari", "Status"].map((h) => (
                <th key={h} className="px-3 py-3 text-xs font-semibold th-muted uppercase tracking-wider">{h}</th>
              ))}
              <th className="px-3 py-3 text-xs font-semibold th-muted uppercase tracking-wider text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => {
              const status = getStokStatus(b.stok, b.reorder_point);
              const statusLabel = status === "habis" ? "Habis" : status === "kritis" ? "Kritis" : status === "rendah" ? "Rendah" : "Aman";
              const f = forecastMap.get(b.id);
              const daysLeft = f?.daysRemaining ?? Infinity;
              const rowWarning = daysLeft < 3 ? "bg-red-50 dark:bg-red-950/20" : daysLeft < 7 ? "bg-amber-50/50 dark:bg-amber-950/10" : "";

              return (
                <tr key={b.id} className={`border-b th-border/50 hover:bg-red-50/30 dark:hover:bg-red-950/10 transition-colors ${rowWarning}`}>
                  <td className="px-3 py-3 text-sm font-medium th-text">{b.nama}</td>
                  <td className="px-3 py-3 text-xs th-text-secondary">{b.kategori}</td>
                  <td className="px-3 py-3 text-sm font-semibold th-text">
                    {tampilanStok(b.stok, b.sat_dasar, b.isi_per_pak, b.sat_beli)}
                    {(b.stok_goreng || 0) > 0 && (
                      <span className="block text-[10px] font-medium text-orange-500">{b.stok_goreng} {b.sat_dasar} goreng</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm th-text-secondary">
                    {f && f.avgDaily > 0 ? (
                      <span>{f.avgDaily.toFixed(1)} {b.sat_dasar}</span>
                    ) : (
                      <span className="th-muted">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {f && f.avgDaily > 0 ? (
                      <span className={`font-semibold ${daysLeft < 3 ? "text-danger" : daysLeft < 7 ? "text-warning" : "text-success"}`}>
                        {daysLeft === Infinity ? "\u221E" : `${daysLeft} hari`}
                      </span>
                    ) : (
                      <span className="th-muted">\u221E</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm">
                    {f && f.avgDaily > 0 ? (
                      f.reorderQty > 0 ? (
                        <span className="text-danger font-semibold">+{f.reorderQty} {b.sat_dasar}</span>
                      ) : (
                        <span className="text-success">Aman</span>
                      )
                    ) : (
                      <span className="th-muted">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${getStokColor(status)} ${getStokBgColor(status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status === "aman" ? "bg-success" : status === "rendah" ? "bg-warning" : "bg-danger"} ${status === "habis" ? "animate-pulse" : ""}`} />
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onRestock(b)} className="flex items-center gap-1 px-2 py-1.5 bg-green-50 dark:bg-green-950/30 text-success rounded-lg text-xs font-medium hover:bg-green-100 dark:hover:bg-green-950/50 transition-colors touch-target border border-green-200 dark:border-green-800">
                        <PlusCircle size={12} /> Stok
                      </button>
                      {b.kategori === "Ayam" && (
                        <button onClick={() => onGoreng(b)} className="flex items-center gap-1 px-2 py-1.5 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-lg text-xs font-medium hover:bg-orange-100 dark:hover:bg-orange-950/50 transition-colors touch-target border border-orange-200 dark:border-orange-800">
                          <Flame size={12} /> Goreng
                        </button>
                      )}
                      <button onClick={() => onOpname(b)} className="flex items-center gap-1 px-2 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-950/50 transition-colors touch-target border border-blue-200 dark:border-blue-800">
                        <ClipboardCheck size={12} /> Opname
                      </button>
                      <button onClick={() => onEdit(b)} className="p-1.5 th-muted hover:th-accent rounded-lg hover:th-surface transition-colors touch-target"><Edit3 size={14} /></button>
                      {confirmDelete === b.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { onDelete(b.id); setConfirmDelete(null); }} className="px-2 py-1.5 bg-danger text-white rounded-lg text-xs font-medium">Hapus</button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 py-1.5 th-muted text-xs">Batal</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(b.id)} className="p-1.5 th-muted hover:text-danger rounded-lg hover:th-surface transition-colors touch-target"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center th-muted">Belum ada bahan baku.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
