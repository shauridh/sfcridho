export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

export function formatStok(stok: number, satDasar: string, isiPerPak: number, satBeli: string): string {
  if (stok <= 0) return `0 ${satDasar}`;
  if (isiPerPak >= 1000 && stok >= isiPerPak) {
    const pakQty = Math.floor(stok / isiPerPak);
    const sisa = stok % isiPerPak;
    if (sisa === 0) return `${pakQty} ${satBeli}`;
    return `${pakQty} ${satBeli} ${sisa} ${satDasar}`;
  }
  return `${formatNumber(stok)} ${satDasar}`;
}

export function formatWaktu(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function formatTanggal(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function konversiKeSatuanDasar(jumlahBeli: number, isiPerPak: number): number {
  return jumlahBeli * isiPerPak;
}

export function tampilanStok(stok: number, satDasar: string, isiPerPak: number, satBeli: string): string {
  if (stok <= 0) return `0 ${satDasar}`;
  const paks = Math.floor(stok / isiPerPak);
  const sisa = stok % isiPerPak;
  if (paks > 0 && sisa === 0) return `${paks} ${satBeli}`;
  if (paks > 0) return `${paks} ${satBeli} + ${formatNumber(sisa)} ${satDasar}`;
  return `${formatNumber(stok)} ${satDasar}`;
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getTodayRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function parseNominalInput(value: string): number {
  const cleaned = value.replace(/[^0-9]/g, "");
  return parseInt(cleaned, 10) || 0;
}
