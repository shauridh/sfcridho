"use client";

interface Props {
  label?: string;
}

// Loading state penuh-layar yang konsisten dipakai di semua halaman.
export default function LoadingScreen({ label = "Memuat..." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 th-muted">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
