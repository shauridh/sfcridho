"use client";

import { formatRupiah, formatWaktu } from "@/lib/utils";
import { Receipt } from "lucide-react";

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
  items: TransaksiItem[];
}

interface Props {
  transaksiList: Transaksi[];
}

export default function TransactionList({ transaksiList }: Props) {
  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <Receipt size={16} className="text-accent" />
        <h3 className="text-sm font-bold th-text">Riwayat Transaksi</h3>
        <span className="text-xs th-muted ml-auto">{transaksiList.length} transaksi</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left bg-red-50/30">
              <th className="px-5 py-3 text-xs font-semibold th-muted uppercase tracking-wider">Waktu</th>
              <th className="px-5 py-3 text-xs font-semibold th-muted uppercase tracking-wider">ID</th>
              <th className="px-5 py-3 text-xs font-semibold th-muted uppercase tracking-wider">Item</th>
              <th className="px-5 py-3 text-xs font-semibold th-muted uppercase tracking-wider text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {transaksiList.map((t) => (
              <tr key={t.id} className="border-b border-border/30 hover:bg-red-50/20 transition-colors">
                <td className="px-5 py-3 text-sm th-text-secondary whitespace-nowrap">
                  {formatWaktu(t.waktu)}
                </td>
                <td className="px-5 py-3 text-xs th-muted font-mono">
                  {t.id.slice(0, 8)}
                </td>
                <td className="px-5 py-3 text-sm th-text">
                  {t.items.map((i) => `${i.nama_snapshot} x${i.qty}`).join(", ")}
                </td>
                <td className="px-5 py-3 text-sm font-bold text-accent text-right whitespace-nowrap">
                  {formatRupiah(t.total)}
                </td>
              </tr>
            ))}
            {transaksiList.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center th-muted text-sm">
                  Belum ada transaksi hari ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
