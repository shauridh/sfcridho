"use client";

import { formatRupiah } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface Item {
  nama: string;
  qty: number;
  omzet: number;
}

interface Props {
  items: Item[];
}

export default function BestSellers({ items }: Props) {
  if (items.length === 0) return null;

  const maxQty = Math.max(...items.map((i) => i.qty));

  return (
    <div className="th-card border th-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={16} className="text-warning" />
        <h3 className="text-sm font-bold th-text">Menu Terlaris</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={item.nama} className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-xs font-bold th-accent shrink-0">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium th-text truncate">{item.nama}</span>
                <span className="text-xs th-text-secondary ml-2">{item.qty} porsi</span>
              </div>
              <div className="w-full h-2 th-surface rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full th-accent-bg transition-all"
                  style={{ width: `${(item.qty / maxQty) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-semibold th-accent whitespace-nowrap">{formatRupiah(item.omzet)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
