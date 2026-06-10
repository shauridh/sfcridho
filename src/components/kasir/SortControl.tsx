"use client";

import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export type SortField = "nama" | "harga" | "kategori";
export type SortOrder = "asc" | "desc";

interface Props {
  field: SortField;
  order: SortOrder;
  onChangeField: (f: SortField) => void;
  onToggleOrder: () => void;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "nama", label: "Nama" },
  { value: "harga", label: "Harga" },
  { value: "kategori", label: "Kategori" },
];

export default function SortControl({ field, order, onChangeField, onToggleOrder }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs th-muted font-semibold uppercase">Urutkan:</span>
      <div className="flex items-center gap-1">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChangeField(opt.value)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              field === opt.value
                ? "th-accent-bg text-white"
                : "th-card border th-border th-muted hover:th-text"
            }`}
          >
            {opt.label}
          </button>
        ))}
        <button
          onClick={onToggleOrder}
          aria-label={`Urutan ${order === "asc" ? "naik" : "turun"}`}
          className="p-1.5 th-card border th-border rounded-lg th-muted hover:th-text transition-colors"
        >
          {order === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        </button>
      </div>
    </div>
  );
}
