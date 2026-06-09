"use client";

import { useState, useEffect } from "react";
import { BahanBaku, getStokStatus } from "@/lib/types";
import { AlertTriangle, X } from "lucide-react";
import Link from "next/link";

interface Props {
  bahanBaku: BahanBaku[];
}

const DISMISS_KEY = "sabana_alert_dismissed";

export default function AlertBanner({ bahanBaku }: Props) {
  const kritisItems = bahanBaku.filter((b) => {
    const status = getStokStatus(b.stok, b.reorder_point);
    return status === "kritis" || status === "habis";
  });

  // Signature daftar bahan kritis. Jika berubah (ada item baru), banner
  // muncul lagi meski sebelumnya sudah ditutup.
  const signature = kritisItems.map((b) => b.id).sort().join(",");

  const [dismissedSig, setDismissedSig] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedSig(localStorage.getItem(DISMISS_KEY));
    } catch {
      setDismissedSig(null);
    }
  }, []);

  if (kritisItems.length === 0) return null;
  if (dismissedSig === signature) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, signature);
    } catch {}
    setDismissedSig(signature);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-950/40 border-b th-border text-danger text-sm font-medium">
      <AlertTriangle size={18} className="shrink-0" />
      <Link href="/stok" className="flex-1 min-w-0 hover:underline">
        <span className="line-clamp-1">
          {kritisItems.length} bahan baku {kritisItems.some((b) => b.stok <= 0) ? "habis" : "kritis"} —
          {" "}{kritisItems.map((b) => b.nama).join(", ")}
        </span>
      </Link>
      <button
        onClick={dismiss}
        aria-label="Tutup peringatan stok"
        className="shrink-0 p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
