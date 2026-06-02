"use client";

import { CartItem } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

interface Props {
  items: CartItem[];
  total: number;
  onUpdateQty: (produkId: string, qty: number) => void;
  onClear: () => void;
  onBayar: () => void;
}

export default function Cart({ items, total, onUpdateQty, onClear, onBayar }: Props) {
  return (
    <div className="flex flex-col h-full th-card">
      <div className="flex items-center justify-between px-5 py-4 border-b th-border">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="th-accent" />
          <h2 className="font-bold th-text">Keranjang</h2>
          {items.length > 0 && (
            <span className="text-xs bg-red-50 dark:bg-red-950/40 th-accent px-2 py-0.5 rounded-full font-semibold border th-border">
              {items.reduce((s, i) => s + i.qty, 0)}
            </span>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={onClear} className="text-xs th-muted hover:text-danger transition-colors font-medium">Hapus Semua</button>
        )}
      </div>

      <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full th-muted">
            <ShoppingBag size={40} className="mb-3 opacity-30" />
            <p className="text-sm">Keranjang kosong</p>
            <p className="text-xs mt-1">Tap produk untuk menambahkan</p>
          </div>
        )}

        {items.map((item) => (
          <div key={item.produk.id} className="flex items-center gap-3 th-surface rounded-xl p-3 border th-border/50">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold th-text truncate">{item.produk.nama}</p>
              <p className="text-xs th-text-secondary">{formatRupiah(item.produk.harga)} × {item.qty}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onUpdateQty(item.produk.id, item.qty - 1)} className="w-8 h-8 flex items-center justify-center th-card border th-border rounded-lg th-muted hover:th-text transition-colors">
                {item.qty === 1 ? <Trash2 size={12} /> : <Minus size={14} />}
              </button>
              <span className="w-8 text-center text-sm font-bold th-text">{item.qty}</span>
              <button onClick={() => onUpdateQty(item.produk.id, item.qty + 1)} className="w-8 h-8 flex items-center justify-center th-card border th-border rounded-lg th-muted hover:th-text transition-colors">
                <Plus size={14} />
              </button>
            </div>
            <div className="text-sm font-bold th-accent w-20 text-right">{formatRupiah(item.produk.harga * item.qty)}</div>
          </div>
        ))}
      </div>

      <div className="border-t th-border px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm th-text-secondary">Total</span>
          <span className="text-2xl font-bold th-accent">{formatRupiah(total)}</span>
        </div>
        <button onClick={onBayar} disabled={items.length === 0} className="w-full py-3.5 th-accent-bg text-white rounded-xl font-bold text-base hover:opacity-90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed touch-target">
          Bayar
        </button>
      </div>
    </div>
  );
}
