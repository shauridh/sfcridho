import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";

export interface SaldoBreakdown {
  drawer: number;
  drawerFormatted: string;
  kasMasuk: number;
  kasMasukFormatted: string;
  kasKeluar: number;
  kasKeluarFormatted: string;
  kasManual: number;
  kasManualFormatted: string;
  akunBank: number;
  akunEwallet: number;
  akunKasFisik: number;
  total: number;
  totalFormatted: string;
}

export function useTotalSaldo() {
  const [breakdown, setBreakdown] = useState<SaldoBreakdown>({
    drawer: 0, drawerFormatted: formatRupiah(0),
    kasMasuk: 0, kasMasukFormatted: formatRupiah(0),
    kasKeluar: 0, kasKeluarFormatted: formatRupiah(0),
    kasManual: 0, kasManualFormatted: formatRupiah(0),
    akunBank: 0, akunEwallet: 0, akunKasFisik: 0,
    total: 0, totalFormatted: formatRupiah(0),
  });
  const [loading, setLoading] = useState(true);

  const fetchTotalSaldo = useCallback(async () => {
    setLoading(true);

    const [shiftRes, kasRes, akunRes] = await Promise.all([
      supabase.from("shift").select("id, uang_buka").eq("status", "open").order("buka_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("kas").select("tipe, nominal, tujuan_akun_id, sumber_akun_id"),
      supabase.from("akun").select("id, tipe").eq("aktif", true),
    ]);

    let drawerCash = 0;
    if (shiftRes.data) {
      const { data: transaksiData } = await supabase
        .from("transaksi")
        .select("total, metode_bayar")
        .eq("shift_id", shiftRes.data.id);
      const totalTunai = (transaksiData || [])
        .filter((t) => (t as any).metode_bayar !== "qris")
        .reduce((s, t) => s + t.total, 0);
      drawerCash = shiftRes.data.uang_buka + totalTunai;
    }

    const kasMasuk = kasRes.data?.filter((k) => k.tipe === "masuk").reduce((s, k) => s + k.nominal, 0) || 0;
    const kasKeluar = kasRes.data?.filter((k) => k.tipe === "keluar").reduce((s, k) => s + k.nominal, 0) || 0;
    const totalKasAll = kasMasuk - kasKeluar;

    let akunBank = 0, akunEwallet = 0, akunKasFisik = 0;
    for (const akun of akunRes.data || []) {
      const [masukRes, keluarRes] = await Promise.all([
        supabase.from("kas").select("nominal").eq("tipe", "masuk").eq("tujuan_akun_id", akun.id),
        supabase.from("kas").select("nominal").eq("tipe", "keluar").eq("sumber_akun_id", akun.id),
      ]);
      const saldo = (masukRes.data?.reduce((s, k) => s + k.nominal, 0) || 0) -
        (keluarRes.data?.reduce((s, k) => s + k.nominal, 0) || 0);
      if (akun.tipe === "bank") akunBank += saldo;
      else if (akun.tipe === "ewallet") akunEwallet += saldo;
      else akunKasFisik += saldo;
    }

    const total = drawerCash + totalKasAll + akunBank + akunEwallet + akunKasFisik;

    setBreakdown({
      drawer: drawerCash,
      drawerFormatted: formatRupiah(drawerCash),
      kasMasuk,
      kasMasukFormatted: formatRupiah(kasMasuk),
      kasKeluar,
      kasKeluarFormatted: formatRupiah(kasKeluar),
      kasManual: totalKasAll,
      kasManualFormatted: formatRupiah(totalKasAll),
      akunBank,
      akunEwallet,
      akunKasFisik,
      total,
      totalFormatted: formatRupiah(total),
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTotalSaldo();
  }, [fetchTotalSaldo]);

  return { breakdown, loading, refresh: fetchTotalSaldo };
}