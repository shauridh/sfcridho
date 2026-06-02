"use client";

import { useState } from "react";
import { formatRupiah, formatWaktu } from "@/lib/utils";
import { Receipt, X, CreditCard, Banknote, QrCode } from "lucide-react";

interface TransaksiItem {
  id: string;
  nama_snapshot: string;
  harga: number;
  qty: number;
}

interface Transaksi {
  id: string;
  waktu: string;
  total: number;
  bayar: number;
  kembalian: number;
  metode_bayar?: string;
  items: TransaksiItem[];
}

interface Props {
  transaksiList: Transaksi[];
}

export default function TransactionList({ transaksiList }: Props) {
  const [selected, setSelected] = useState<Transaksi | null>(null);

  return (
    <>
      <div className="th-card border th-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-5 py-4 border-b th-border">
          <Receipt size={16} className="th-accent" />
          <h3 className="text-sm font-bold th-text">Riwayat Transaksi</h3>
          <span className="text-xs th-muted ml-auto">{transaksiList.length} transaksi</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b th-border bg-red-50/30 dark:bg-red-950/10">
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase tracking-wider text-left">Waktu</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase tracking-wider text-left">ID</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase tracking-wider text-left">Item</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase tracking-wider text-left">Bayar</th>
                <th className="px-5 py-3 text-xs font-semibold th-muted uppercase tracking-wider text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {transaksiList.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="border-b th-border/30 hover:bg-red-50/20 dark:hover:bg-red-950/10 transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3 text-sm th-text-secondary whitespace-nowrap">{formatWaktu(t.waktu)}</td>
                  <td className="px-5 py-3 text-xs th-muted font-mono">{t.id.slice(0, 8)}</td>
                  <td className="px-5 py-3 text-sm th-text">
                    {t.items.length > 2
                      ? `${t.items[0].nama_snapshot} ×${t.items[0].qty}, ${t.items[1].nama_snapshot} ×${t.items[1].qty}, +${t.items.length - 2} lainnya`
                      : t.items.map((i) => `${i.nama_snapshot} ×${i.qty}`).join(", ")}
                  </td>
                  <td className="px-5 py-3 text-xs th-muted">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.metode_bayar === "qris" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600" : "bg-green-50 dark:bg-green-950/30 text-green-600"}`}>
                      {t.metode_bayar === "qris" ? <QrCode size={10} /> : <Banknote size={10} />}
                      {t.metode_bayar === "qris" ? "QRIS" : "Tunai"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-bold text-accent text-right whitespace-nowrap">{formatRupiah(t.total)}</td>
                </tr>
              ))}
              {transaksiList.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center th-muted text-sm">Belum ada transaksi hari ini</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="th-card border th-border rounded-2xl w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b th-border">
              <div className="flex items-center gap-2">
                <Receipt size={18} className="th-accent" />
                <h2 className="text-lg font-bold th-text">Detail Transaksi</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 th-muted hover:th-text"><X size={20} /></button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="th-muted">ID</span>
                <span className="font-mono th-text-secondary">{selected.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="th-muted">Waktu</span>
                <span className="th-text">{new Date(selected.waktu).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="th-muted">Metode</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${selected.metode_bayar === "qris" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-600" : "bg-green-50 dark:bg-green-950/30 text-green-600"}`}>
                  {selected.metode_bayar === "qris" ? <QrCode size={12} /> : <Banknote size={12} />}
                  {selected.metode_bayar === "qris" ? "QRIS" : "Tunai"}
                </span>
              </div>

              <div className="border-t th-border pt-3">
                <p className="text-xs font-semibold th-muted uppercase mb-2">Pesanan</p>
                <div className="space-y-2">
                  {selected.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium th-text truncate">{item.nama_snapshot}</p>
                        <p className="text-xs th-muted">{formatRupiah(item.harga)} × {item.qty}</p>
                      </div>
                      <p className="text-sm font-bold th-accent ml-3">{formatRupiah(item.harga * item.qty)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t th-border pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="th-muted">Total</span>
                  <span className="font-bold th-text">{formatRupiah(selected.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="th-muted">Bayar</span>
                  <span className="th-text">{formatRupiah(selected.bayar)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="th-muted">Kembalian</span>
                  <span className="text-success font-medium">{formatRupiah(selected.kembalian)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
