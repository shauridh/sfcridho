"use client";

import { formatRupiah, formatWaktu } from "@/lib/utils";
import { CartItem } from "@/lib/types";

interface ReceiptData {
  items: CartItem[];
  total: number;
  bayar: number;
  kembalian: number;
  transaksiId: string;
  waktu: Date;
  metode?: "tunai" | "qris";
}

interface Props {
  receipt: ReceiptData;
  onClose: () => void;
}

export default function ReceiptStruk({ receipt, onClose }: Props) {
  const { items, total, bayar, kembalian, transaksiId, waktu } = receipt;

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="th-card rounded-2xl w-full max-w-sm shadow-xl overflow-hidden border th-border" onClick={(e) => e.stopPropagation()}>
        <div className="th-accent-bg text-white text-center py-4 px-5">
          <h2 className="text-lg font-bold tracking-wide">SABANA FRIED CHICKEN</h2>
          <p className="text-xs opacity-80 mt-0.5">Struk Pembayaran</p>
        </div>
        <div className="px-5 py-3 border-b th-border text-xs th-text-secondary flex justify-between">
          <span>{waktu.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })} {formatWaktu(waktu.toISOString())}</span>
          <span className="font-mono th-muted">{transaksiId.slice(0, 8)}</span>
        </div>
        <div className="px-5 py-3 space-y-1.5 border-b th-border">
          {items.map((item) => (
            <div key={item.produk.id} className="flex justify-between text-sm">
              <div className="flex-1 min-w-0">
                <span className="th-text font-medium">{item.produk.nama}</span>
                <span className="th-muted ml-1">x{item.qty}</span>
              </div>
              <span className="th-text font-semibold ml-3 whitespace-nowrap">{formatRupiah(item.produk.harga * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 space-y-1.5 border-b th-border bg-red-50/50 dark:bg-red-950/20">
          <div className="flex justify-between text-sm"><span className="th-text-secondary">Total</span><span className="th-text font-bold">{formatRupiah(total)}</span></div>
          <div className="flex justify-between text-sm"><span className="th-text-secondary">Bayar</span><span className="th-text">{formatRupiah(bayar)}</span></div>
          {receipt.metode && <div className="flex justify-between text-sm"><span className="th-text-secondary">Metode</span><span className="th-text font-medium uppercase">{receipt.metode}</span></div>}
          <div className="flex justify-between text-sm pt-1.5 border-t th-border"><span className="th-text-secondary font-semibold">Kembalian</span><span className="th-accent font-bold text-base">{formatRupiah(kembalian)}</span></div>
        </div>
        <div className="px-5 py-4 text-center">
          <p className="text-sm th-text-secondary mb-4">Terima Kasih</p>
          <button onClick={onClose} className="w-full py-3 th-accent-bg text-white rounded-xl font-bold text-sm hover:opacity-90 transition-colors touch-target">Transaksi Baru</button>
        </div>
      </div>
    </div>
  );
}
