"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BahanBaku, ForecastItem } from "@/lib/types";

export function useStok() {
  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>([]);
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

  const getForecast = useCallback((): ForecastItem[] => {
    return bahanBaku.map((b) => {
      const avgDaily = b.avg_daily || 0;
      const daysRemaining = avgDaily > 0 ? Math.floor(b.stok / avgDaily) : Infinity;
      const stockNeeded7d = Math.ceil(avgDaily * 7);
      const reorderQty = Math.max(0, stockNeeded7d - b.stok);
      return { ...b, avgDaily, daysRemaining, stockNeeded7d, reorderQty };
    });
  }, [bahanBaku]);

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

  const goreng = async (id: string, jumlahKantong: number) => {
    const bahan = bahanBaku.find((b) => b.id === id);
    if (!bahan) return { error: new Error("Bahan tidak ditemukan") };

    const potongHasil = jumlahKantong * bahan.isi_per_pak;
    if (bahan.stok < potongHasil) return { error: new Error("Stok mentah tidak cukup") };

    const resep = bahan.resep_goreng || [];
    for (const item of resep) {
      const bahanTerkait = bahanBaku.find((b) => b.id === item.bahan_id);
      if (!bahanTerkait) continue;
      const dibutuhkan = jumlahKantong * item.qty_per_kantong;
      if (bahanTerkait.stok < dibutuhkan) {
        return { error: new Error(`Stok ${bahanTerkait.nama} tidak cukup (butuh ${dibutuhkan.toFixed(2)} ${bahanTerkait.sat_dasar}, tersedia ${bahanTerkait.stok})`) };
      }
    }

    const stokMentahBaru = bahan.stok - potongHasil;
    const stokGorengBaru = (bahan.stok_goreng || 0) + potongHasil;

    const { error: updateError } = await supabase
      .from("bahan_baku")
      .update({ stok: stokMentahBaru, stok_goreng: stokGorengBaru })
      .eq("id", id);

    if (updateError) return { error: updateError };

    await supabase.from("stok_log").insert({
      bahan_id: id,
      tipe: "goreng",
      qty: potongHasil,
      referensi: `Goreng ${jumlahKantong} kantong (${potongHasil} ${bahan.sat_dasar})`,
    });

    for (const item of resep) {
      const bahanTerkait = bahanBaku.find((b) => b.id === item.bahan_id);
      if (!bahanTerkait) continue;
      const dibutuhkan = jumlahKantong * item.qty_per_kantong;
      const stokBaru = bahanTerkait.stok - dibutuhkan;
      await supabase.from("bahan_baku").update({ stok: stokBaru }).eq("id", item.bahan_id);
      await supabase.from("stok_log").insert({
        bahan_id: item.bahan_id,
        tipe: "goreng",
        qty: -dibutuhkan,
        referensi: `Pakai ${dibutuhkan.toFixed(2)} ${bahanTerkait.sat_dasar} untuk goreng ${jumlahKantong} kantong ${bahan.nama}`,
      });
    }

    await fetchBahanBaku();
    return { error: null };
  };

  return {
    bahanBaku,
    forecast: getForecast(),
    loading,
    alertCount,
    tambahBahan,
    editBahan,
    hapusBahan,
    restock,
    opname,
    goreng,
    refresh: fetchBahanBaku,
  };
}
