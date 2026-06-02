"use client";

import { formatRupiah } from "@/lib/utils";
import { useState } from "react";
import { Target, Settings } from "lucide-react";

interface Props {
  current: number;
  target: number;
  onTargetChange: (target: number) => void;
}

export default function TargetProgress({ current, target, onTargetChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(target.toString());

  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const sisa = Math.max(target - current, 0);
  const tercapai = current >= target;

  const handleSave = () => {
    const val = parseInt(inputValue.replace(/[^0-9]/g, ""), 10);
    if (val > 0) {
      onTargetChange(val);
    }
    setEditing(false);
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-accent" />
          <h3 className="text-sm font-bold th-text">Target Harian</h3>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="w-32 px-2 py-1 bg-white border border-border rounded-lg text-xs th-text focus:outline-none focus:border-accent text-right"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="text-xs text-accent font-medium"
            >
              Simpan
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setInputValue(target.toString());
              setEditing(true);
            }}
            className="flex items-center gap-1 text-xs th-muted hover:th-text transition-colors"
          >
            <Settings size={12} />
            {formatRupiah(target)}
          </button>
        )}
      </div>

      <div className="mb-3">
        <div className="flex items-end justify-between mb-1">
          <span className="text-3xl font-bold text-accent">{percentage.toFixed(0)}%</span>
          <span className="text-sm th-text-secondary">
            {formatRupiah(current)} / {formatRupiah(target)}
          </span>
        </div>
        <div className="w-full h-3 bg-red-50 rounded-full overflow-hidden border border-border">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              tercapai ? "bg-success" : percentage > 70 ? "bg-accent" : "bg-warning"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <p className="text-xs th-text-secondary">
        {tercapai ? (
          <span className="text-success font-semibold">Target tercapai!</span>
        ) : (
          <>
            Sisa <span className="font-semibold th-text">{formatRupiah(sisa)}</span> lagi untuk mencapai target
          </>
        )}
      </p>
    </div>
  );
}
