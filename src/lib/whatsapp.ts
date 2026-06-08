"use client";

import { supabase } from "@/lib/supabase";

export async function getSettings(): Promise<Record<string, string>> {
  const { data } = await supabase.from("settings").select("key, value");
  if (!data) return {};
  const map: Record<string, string> = {};
  data.forEach((r) => (map[r.key] = r.value));
  return map;
}

export async function updateSetting(key: string, value: string) {
  return supabase.from("settings").upsert({ key, value }, { onConflict: "key" });
}

export async function sendWhatsApp(message: string, to?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getSettings();
    const apiKey = settings.wa_api_key;
    const phone = settings.wa_phone;
    const sender = settings.wa_sender || phone;
    const storeName = settings.store_name || "Sabana FC";

    if (!apiKey || !phone) {
      return { success: false, error: "WhatsApp belum dikonfigurasi" };
    }

    const targetPhone = to || phone;

    const resp = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        sender: sender,
        number: targetPhone,
        message: message,
        footer: `Sent via ${storeName}`,
      }),
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
    const settings = await getSettings();
    const apiKey = settings.wa_api_key;
    const sender = settings.wa_sender || settings.wa_phone;
    const storeName = settings.store_name || "Sabana FC";

    if (!apiKey || !to) {
      return { success: false, error: "WhatsApp belum dikonfigurasi atau nomor tujuan kosong" };
    }

    const resp = await fetch("/api/whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        sender: sender,
        number: to,
        type: "image",
        image: base64Image,
        caption: caption || `Sent via ${storeName}`,
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
