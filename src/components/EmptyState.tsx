"use client";

import { LucideIcon } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Empty state konsisten untuk tabel & list kosong.
export default function EmptyState({ icon: Icon, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && <Icon size={48} className="th-muted opacity-40 mb-3" />}
      <p className="text-sm th-muted">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 th-accent-bg text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
