"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { CartItem, Transaksi, TransaksiItem, Resep } from "@/lib/types";

interface TransaksiWithItems extends Transaksi {
  items: TransaksiItem[];
}

export function useTransaksi() {
  const [loading, setLoading] = useState(false);

  const prosesPembayaran = async (
    cart: CartItem[],
    total: number,
    bayar: number,
    resepMap: Record<string, Resep[]>,
    metode: "tunai" | "qris" = "tunai"
  ) => {
    setLoading(true);

    try {
      const items = cart.map((item) => {
        const resepList = resepMap[item.produk.id] || [];
        const addonNames = (item.addons || []).map((a) => a.nama).join(", ");
        const addonTotal = (item.addons || []).reduce((s, a) => s + a.harga, 0);
        return {
          produk_id: item.produk.id,
          nama_snapshot: addonNames ? `${item.produk.nama} + ${addonNames}` : item.produk.nama,
          harga: item.produk.harga + addonTotal,
          qty: item.qty,
          resep: resepList.map((r) => ({
            bahan_id: r.bahan_id,
            qty: r.qty,
          })),
        };
      });

      const { data, error } = await supabase.rpc("process_transaction", {
        p_total: total,
        p_bayar: bayar,
        p_items: items,
      });

      if (error) {
        console.error("Transaction error:", error);
        return { error, transaksiId: null };
      }

      if (data) {
        await supabase.from("transaksi").update({ metode_bayar: metode }).eq("id", data);
      }

      return { error: null, transaksiId: data };
    } catch (err) {
      console.error("Transaction error:", err);
      return { error: err, transaksiId: null };
    } finally {
      setLoading(false);
    }
  };

  const getTransaksiHariIni = useCallback(async (date?: Date): Promise<TransaksiWithItems[]> => {
    const targetDate = date || new Date();
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const { data: transaksiData, error } = await supabase
      .from("transaksi")
      .select("*")
      .gte("waktu", start.toISOString())
      .lt("waktu", end.toISOString())
      .order("waktu", { ascending: false });

    if (error || !transaksiData) return [];

    const transaksiIds = transaksiData.map((t) => t.id);
    if (transaksiIds.length === 0) return [];

    const { data: itemsData } = await supabase
      .from("transaksi_item")
      .select("*")
      .in("transaksi_id", transaksiIds);

    return transaksiData.map((t) => ({
      ...t,
      items: (itemsData || []).filter((i) => i.transaksi_id === t.id),
    }));
  }, []);

  const getLaporanHariIni = useCallback(
    async (date?: Date) => {
      const transaksiList = await getTransaksiHariIni(date);

      const totalOmzet = transaksiList.reduce((sum, t) => sum + t.total, 0);
      const jumlahTransaksi = transaksiList.length;
      const rataRata = jumlahTransaksi > 0 ? Math.round(totalOmzet / jumlahTransaksi) : 0;
      const totalItem = transaksiList.reduce(
        (sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0),
        0
      );

      const perJam: Record<number, number> = {};
      for (let i = 0; i < 24; i++) perJam[i] = 0;
      transaksiList.forEach((t) => {
        const jam = new Date(t.waktu).getHours();
        perJam[jam] = (perJam[jam] || 0) + t.total;
      });

      const hourlyData = Object.entries(perJam)
        .filter(([_, v]) => v > 0 || parseInt(_) >= 8)
        .map(([jam, omzet]) => ({
          jam: `${jam}:00`,
          omzet,
        }));

      const bestSellers: Record<string, { nama: string; qty: number; omzet: number }> = {};
      transaksiList.forEach((t) => {
        t.items.forEach((i) => {
          if (!bestSellers[i.nama_snapshot]) bestSellers[i.nama_snapshot] = { nama: i.nama_snapshot, qty: 0, omzet: 0 };
          bestSellers[i.nama_snapshot].qty += i.qty;
          bestSellers[i.nama_snapshot].omzet += i.harga * i.qty;
        });
      });
      const bestSellersList = Object.values(bestSellers).sort((a, b) => b.qty - a.qty).slice(0, 5);

      const peakHours = Object.entries(perJam)
        .filter(([_, v]) => v > 0)
        .map(([jam, total]) => ({ jam: parseInt(jam), total, label: `${jam}:00` }))
        .sort((a, b) => b.total - a.total);

      const tunaiList = transaksiList.filter((t) => (t as any).metode_bayar !== "qris");
      const qrisList = transaksiList.filter((t) => (t as any).metode_bayar === "qris");
      const metodeBayar = {
        tunai: { count: tunaiList.length, total: tunaiList.reduce((s, t) => s + t.total, 0) },
        qris: { count: qrisList.length, total: qrisList.reduce((s, t) => s + t.total, 0) },
      };

      return {
        totalOmzet,
        jumlahTransaksi,
        rataRata,
        totalItem,
        hourlyData,
        transaksiList,
        bestSellersList,
        peakHours,
        metodeBayar,
      };
    },
    [getTransaksiHariIni]
  );

  const getWeeklyTrend = useCallback(async () => {
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const result: { day: string; omzet: number; transaksi: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

      const { data } = await supabase
        .from("transaksi")
        .select("total")
        .gte("waktu", start.toISOString())
        .lt("waktu", end.toISOString());

      result.push({
        day: days[d.getDay()],
        omzet: data?.reduce((s, t) => s + t.total, 0) || 0,
        transaksi: data?.length || 0,
      });
    }
    return result;
  }, []);

  return {
    loading,
    prosesPembayaran,
    getTransaksiHariIni,
    getLaporanHariIni,
    getWeeklyTrend,
  };
}
