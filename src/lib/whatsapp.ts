"use client";

import { supabase } from "@/lib/supabase";

export interface WATemplate {
  enabled: boolean;
  template: string;
}

export const WA_TEMPLATE_TYPES = [
  { key: "new_order", label: "Pesanan Baru (ke Admin)", placeholders: "{store_name}, {nama}, {phone}, {items}, {subtotal}, {ongkir}, {total}, {location}, {patokan}" },
  { key: "confirm", label: "Konfirmasi + QRIS (ke Customer)", placeholders: "{store_name}, {nama}, {items}, {total}, {ongkir}, {available_items}, {unavailable_items}" },
  { key: "reject", label: "Tolak Pesanan (ke Customer)", placeholders: "{store_name}, {catatan}" },
  { key: "done", label: "Pesanan Selesai (ke Customer)", placeholders: "{store_name}" },
  { key: "cancel", label: "Batalkan Pesanan (ke Customer)", placeholders: "{store_name}" },
] as const;

export const DEFAULT_TEMPLATES: Record<string, WATemplate> = {
  new_order: {
    enabled: true,
    template: `*{store_name}*\nPesanan online baru!\n\nDari: {nama}\nNo: {phone}\n{items}\nSubtotal: Rp {subtotal}\nOngkir: Rp {ongkir}\nTotal: Rp {total}{location}\n\nBuka kasir untuk konfirmasi.`,
  },
  confirm: {
    enabled: true,
    template: `*{store_name}*\nPesanan Anda dikonfirmasi!\n\n{available_items}{unavailable_items}\nTotal: Rp {total}\n\nSilakan scan QRIS di atas untuk pembayaran.\nSetelah bayar, kirim bukti bayar via chat ini.`,
  },
  reject: {
    enabled: true,
    template: `*{store_name}*\nMaaf, pesanan Anda tidak tersedia saat ini.{catatan}\n\nSilakan pesan kembali lain waktu.`,
  },
  done: {
    enabled: true,
    template: `*{store_name}*\nPesanan Anda telah selesai! Terima kasih 🙏`,
  },
  cancel: {
    enabled: true,
    template: `*{store_name}*\nPesanan Anda telah dibatalkan.`,
  },
};

export async function getWATemplates(): Promise<Record<string, WATemplate>> {
  const { data } = await supabase.from("settings").select("value").eq("key", "wa_templates").single();
  if (data?.value) {
    try {
      return { ...DEFAULT_TEMPLATES, ...JSON.parse(data.value) };
    } catch {}
  }
  return { ...DEFAULT_TEMPLATES };
}

export async function saveWATemplates(templates: Record<string, WATemplate>) {
  return supabase.from("settings").upsert({ key: "wa_templates", value: JSON.stringify(templates) }, { onConflict: "key" });
}

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

export async function getSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from("settings").select("key, value");
  if (!data) return {};
  const map: Record<string, string> = {};
  data.forEach((r) => (map[r.key] = r.value));
  return map;
}

// Untuk halaman publik (/order): hanya key non-sensitif (tanpa wa_api_key).
export async function getPublicSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.rpc("get_public_settings");
  if (!data) return {};
  const map: Record<string, string> = {};
  (data as { key: string; value: string }[]).forEach((r) => (map[r.key] = r.value));
  return map;
}

export async function updateSetting(key: string, value: string) {
  return supabase.from("settings").upsert({ key, value }, { onConflict: "key" });
}

export async function sendWhatsApp(message: string, to?: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Kredensial & nomor default di-resolve di server (/api/whatsapp).
    // Browser hanya boleh mengirim pesan + nomor tujuan, tidak pernah API key.
    const resp = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: to || "default", message }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { success: false, error: `HTTP ${resp.status}: ${text}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal mengirim" };
  }
}

export async function sendWhatsAppImage(base64Image: string, to: string, caption?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!to) {
      return { success: false, error: "Nomor tujuan kosong" };
    }

    const resp = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: to,
        type: "image",
        image: base64Image,
        caption: caption || "",
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { success: false, error: `HTTP ${resp.status}: ${text}` };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Gagal mengirim gambar" };
  }
}

export function formatLaporanWA(data: {
  storeName: string;
  date: string;
  totalOmzet: number;
  jumlahTransaksi: number;
  rataRata: number;
  bestSellers: { nama: string; qty: number }[];
  kasMasuk: number;
  kasKeluar: number;
  metodeBayar?: { tunai: { count: number; total: number }; qris: { count: number; total: number } };
  shiftInfo?: { uangBuka: number; uangAmbil: number; uangDrawer: number };
  stokOpname?: { nama: string; stok: number; sat: string; status: string }[];
}): string {
  const lines: string[] = [];

  lines.push(`*${data.storeName}*`);
  lines.push(`Laporan Harian - ${data.date}`);
  lines.push(``);
  lines.push(`[Ringkasan Penjualan]`);
  lines.push(`Omzet: Rp ${data.totalOmzet.toLocaleString("id-ID")}`);
  lines.push(`Transaksi: ${data.jumlahTransaksi}`);
  lines.push(`Rata-rata: Rp ${data.rataRata.toLocaleString("id-ID")}`);
  lines.push(``);

  if (data.metodeBayar) {
    lines.push(`[Metode Pembayaran]`);
    lines.push(`Tunai: Rp ${data.metodeBayar.tunai.total.toLocaleString("id-ID")} (${data.metodeBayar.tunai.count} trx)`);
    lines.push(`QRIS: Rp ${data.metodeBayar.qris.total.toLocaleString("id-ID")} (${data.metodeBayar.qris.count} trx)`);
    lines.push(``);
  }

  if (data.bestSellers.length > 0) {
    lines.push(`[Menu Terlaris]`);
    data.bestSellers.forEach((b, i) => {
      lines.push(`${i + 1}. ${b.nama} (${b.qty} porsi)`);
    });
    lines.push(``);
  }

  lines.push(`[Kas]`);
  lines.push(`Masuk: Rp ${data.kasMasuk.toLocaleString("id-ID")}`);
  lines.push(`Keluar: Rp ${data.kasKeluar.toLocaleString("id-ID")}`);

  if (data.shiftInfo) {
    lines.push(``);
    lines.push(`[Kasir]`);
    lines.push(`Uang Buka: Rp ${data.shiftInfo.uangBuka.toLocaleString("id-ID")}`);
    lines.push(`Diambil: Rp ${data.shiftInfo.uangAmbil.toLocaleString("id-ID")}`);
    lines.push(`Sisa Drawer: Rp ${data.shiftInfo.uangDrawer.toLocaleString("id-ID")}`);
  }

  if (data.stokOpname && data.stokOpname.length > 0) {
    const stokWarning = data.stokOpname.filter((s) => s.status !== "aman");
    if (stokWarning.length > 0) {
      lines.push(``);
      lines.push(`[Stok Perlu Perhatian]`);
      stokWarning.forEach((s) => {
        const icon = s.status === "habis" ? "!!" : s.status === "kritis" ? "!" : "~";
        lines.push(`${icon} ${s.nama}: ${s.stok} ${s.sat} (${s.status})`);
      });
    }

    lines.push(``);
    lines.push(`[Stok Lengkap]`);
    data.stokOpname.forEach((s) => {
      lines.push(`- ${s.nama}: ${s.stok} ${s.sat}`);
    });
  }

  return lines.join("\n");
}
