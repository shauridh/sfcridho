"use client";

import { formatRupiah, formatNumber } from "@/lib/utils";
import { TrendingUp, Receipt, BarChart3, Package } from "lucide-react";

interface Props {
  totalOmzet: number;
  jumlahTransaksi: number;
  rataRata: number;
  totalItem: number;
}

const CARDS = [
  { key: "omzet", label: "Total Omzet", icon: TrendingUp, color: "text-accent", bg: "bg-red-50" },
  { key: "transaksi", label: "Jumlah Transaksi", icon: Receipt, color: "text-success", bg: "bg-green-50" },
  { key: "rataRata", label: "Rata-rata/Transaksi", icon: BarChart3, color: "text-warning", bg: "bg-amber-50" },
  { key: "item", label: "Total Item Terjual", icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
];

export default function SummaryCards({ totalOmzet, jumlahTransaksi, rataRata, totalItem }: Props) {
  const values: Record<string, string> = {
    omzet: formatRupiah(totalOmzet),
    transaksi: formatNumber(jumlahTransaksi),
    rataRata: formatRupiah(rataRata),
    item: formatNumber(totalItem),
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="th-card border th-border rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <Icon size={16} className={card.color} />
              </div>
              <span className="text-xs font-semibold th-muted uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{values[card.key]}</p>
          </div>
        );
      })}
    </div>
  );
}
