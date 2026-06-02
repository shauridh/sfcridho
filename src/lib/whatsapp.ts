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

export async function sendWhatsApp(message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getSettings();
    const apiKey = settings.wa_api_key;
    const phone = settings.wa_phone;
    const sender = settings.wa_sender || phone;
    const storeName = settings.store_name || "Sabana FC";

    if (!apiKey || !phone) {
      return { success: false, error: "WhatsApp belum dikonfigurasi" };
    }

    const resp = await fetch("https://seen.getsender.id/send-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        sender: sender,
        number: phone,
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

export function formatLaporanWA(data: {
  storeName: string;
  date: string;
  totalOmzet: number;
  jumlahTransaksi: number;
  rataRata: number;
  bestSellers: { nama: string; qty: number }[];
  kasMasuk: number;
  kasKeluar: number;
  shiftInfo?: { uangBuka: number; uangAmbil: number; uangDrawer: number };
}): string {
  const lines = [
    `*${data.storeName}*`,
    `Laporan Harian — ${data.date}`,
    ``,
    `📊 *Ringkasan Penjualan*`,
    `Omzet: Rp ${data.totalOmzet.toLocaleString("id-ID")}`,
    `Transaksi: ${data.jumlahTransaksi}`,
    `Rata-rata: Rp ${data.rataRata.toLocaleString("id-ID")}`,
    ``,
  ];

  if (data.bestSellers.length > 0) {
    lines.push(`🏆 *Menu Terlaris*`);
    data.bestSellers.forEach((b, i) => {
      lines.push(`${i + 1}. ${b.nama} (${b.qty} porsi)`);
    });
    lines.push(``);
  }

  lines.push(`💰 *Kas*`);
  lines.push(`Masuk: Rp ${data.kasMasuk.toLocaleString("id-ID")}`);
  lines.push(`Keluar: Rp ${data.kasKeluar.toLocaleString("id-ID")}`);

  if (data.shiftInfo) {
    lines.push(``);
    lines.push(`🏪 *Kasir*`);
    lines.push(`Uang Buka: Rp ${data.shiftInfo.uangBuka.toLocaleString("id-ID")}`);
    lines.push(`Diambil: Rp ${data.shiftInfo.uangAmbil.toLocaleString("id-ID")}`);
    lines.push(`Sisa Drawer: Rp ${data.shiftInfo.uangDrawer.toLocaleString("id-ID")}`);
  }

  return lines.join("\n");
}
