"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BahanBaku, ForecastItem } from "@/lib/types";

export function useStok() {
  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>([]);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBahanBaku = useCallback(async () => {
    const { data, error } = await supabase
      .from("bahan_baku")
      .select("*")
      .order("nama");

    if (!error && data) {
      setBahanBaku(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBahanBaku();
  }, [fetchBahanBaku]);

  const fetchForecast = useCallback(async () => {
    if (bahanBaku.length === 0) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: logs } = await supabase
      .from("stok_log")
      .select("bahan_id, qty, waktu")
      .eq("tipe", "deduct")
      .gte("waktu", sevenDaysAgo.toISOString());

    const usageMap: Record<string, { total: number; days: Set<string> }> = {};
    (logs || []).forEach((l: any) => {
      if (!usageMap[l.bahan_id]) usageMap[l.bahan_id] = { total: 0, days: new Set() };
      usageMap[l.bahan_id].total += Math.abs(l.qty);
      usageMap[l.bahan_id].days.add(new Date(l.waktu).toDateString());
    });

    const result: ForecastItem[] = bahanBaku.map((b) => {
      const usage = usageMap[b.id];
      const activeDays = usage ? usage.days.size : 0;
      const avgDaily = usage && activeDays > 0 ? usage.total / activeDays : 0;
      const daysRemaining = avgDaily > 0 ? Math.floor(b.stok / avgDaily) : Infinity;
      const stockNeeded7d = Math.ceil(avgDaily * 7);
      const reorderQty = Math.max(0, stockNeeded7d - b.stok);
      return { ...b, avgDaily, daysRemaining, stockNeeded7d, reorderQty };
    });

    setForecast(result);
  }, [bahanBaku]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const tambahBahan = async (bahan: Omit<BahanBaku, "id" | "created_at">) => {
    const { error } = await supabase.from("bahan_baku").insert(bahan);
    if (!error) await fetchBahanBaku();
    return { error };
  };

  const editBahan = async (id: string, bahan: Partial<BahanBaku>) => {
    const { error } = await supabase.from("bahan_baku").update(bahan).eq("id", id);
    if (!error) await fetchBahanBaku();
    return { error };
  };

  const hapusBahan = async (id: string) => {
    const { error } = await supabase.from("bahan_baku").delete().eq("id", id);
    if (!error) await fetchBahanBaku();
    return { error };
  };

  const restock = async (id: string, jumlahBeli: number) => {
    const bahan = bahanBaku.find((b) => b.id === id);
    if (!bahan) return { error: new Error("Bahan tidak ditemukan") };

    const tambahStok = jumlahBeli * bahan.isi_per_pak;
    const stokBaru = bahan.stok + tambahStok;

    const { error: updateError } = await supabase
      .from("bahan_baku")
      .update({ stok: stokBaru })
      .eq("id", id);

    if (updateError) return { error: updateError };

    await supabase.from("stok_log").insert({
      bahan_id: id,
      tipe: "restock",
      qty: tambahStok,
      referensi: `Restock ${jumlahBeli} ${bahan.sat_beli}`,
    });

    await fetchBahanBaku();
    return { error: null };
  };

  const opname = async (id: string, jumlahAktual: number) => {
    const bahan = bahanBaku.find((b) => b.id === id);
    if (!bahan) return { error: new Error("Bahan tidak ditemukan") };

    const selisih = jumlahAktual - bahan.stok;

    const { error: updateError } = await supabase
      .from("bahan_baku")
      .update({ stok: jumlahAktual })
      .eq("id", id);

    if (updateError) return { error: updateError };

    await supabase.from("stok_log").insert({
      bahan_id: id,
      tipe: "adjust",
      qty: selisih,
      referensi: `Opname: ${bahan.stok} → ${jumlahAktual} ${bahan.sat_dasar}`,
    });

    await fetchBahanBaku();
    return { error: null };
  };

  const alertCount = bahanBaku.filter(
    (b) => b.stok <= b.reorder_point
  ).length;

  return {
    bahanBaku,
    forecast,
    loading,
    alertCount,
    tambahBahan,
    editBahan,
    hapusBahan,
    restock,
    opname,
    refresh: fetchBahanBaku,
  };
}
