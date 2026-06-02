"use client";

import { ForecastItem } from "@/lib/types";
import { AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";

interface Props {
  forecast: ForecastItem[];
}

export default function ForecastBanner({ forecast }: Props) {
  const critical = forecast.filter((f) => f.daysRemaining < 7 && f.avgDaily > 0);

  if (critical.length === 0) return null;

  return (
    <Link
      href="/stok"
      className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b th-border text-amber-700 dark:text-amber-400 text-sm font-medium"
    >
      <Clock size={18} />
      <span>
        Stok kurang dari 7 hari:{" "}
        {critical
          .sort((a, b) => a.daysRemaining - b.daysRemaining)
          .map((f) => `${f.nama} (${f.daysRemaining} hari)`)
          .join(", ")}
      </span>
    </Link>
  );
}
