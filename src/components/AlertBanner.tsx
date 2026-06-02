"use client";

import { BahanBaku, getStokStatus } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Props {
  bahanBaku: BahanBaku[];
}

export default function AlertBanner({ bahanBaku }: Props) {
  const kritisItems = bahanBaku.filter((b) => {
    const status = getStokStatus(b.stok, b.reorder_point);
    return status === "kritis" || status === "habis";
  });

  if (kritisItems.length === 0) return null;

  return (
    <Link
      href="/stok"
      className="flex items-center gap-3 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 border-b th-border text-danger text-sm font-medium"
    >
      <AlertTriangle size={18} />
      <span>
        {kritisItems.length} bahan baku {kritisItems.some((b) => b.stok <= 0) ? "habis" : "kritis"} —
        {" "}{kritisItems.map((b) => b.nama).join(", ")}
      </span>
    </Link>
  );
}
