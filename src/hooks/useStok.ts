"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BahanBaku, ForecastItem, WeeklyForecastItem } from "@/lib/types";

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

  const gorengHarian = async (jumlahBatch: number) => {
    const ayam = bahanBaku.find((b) => b.kategori.toLowerCase() === "ayam");
    const tepung = bahanBaku.find((b) => b.nama.toLowerCase().includes("tepung"));
    const minyak = bahanBaku.find((b) => b.nama.toLowerCase().includes("minyak"));

    if (!ayam) return { error: new Error("Bahan 'Ayam' tidak ditemukan. Pastikan kategori Ayam ada.") };

    const ayamPakDipakai = jumlahBatch * 3;
    const ayamPotongDipakai = ayamPakDipakai * ayam.isi_per_pak;
    const tepungKgDipakai = tepung ? jumlahBatch * 1 : 0;
    const minyakLDipakai = minyak ? 2 : 0;

    if (ayam.stok < ayamPotongDipakai) return { error: new Error(`Stok ayam mentah tidak cukup (butuh ${ayamPotongDipakai}, tersedia ${ayam.stok})`) };
    if (tepung && tepung.stok < tepungKgDipakai) return { error: new Error(`Stok tepung tidak cukup (butuh ${tepungKgDipakai} kg, tersedia ${tepung.stok})`) };
    if (minyak && minyak.stok < minyakLDipakai) return { error: new Error(`Stok minyak tidak cukup (butuh ${minyakLDipakai} L, tersedia ${minyak.stok})`) };

    await supabase.from("bahan_baku").update({
      stok: ayam.stok - ayamPotongDipakai,
      stok_goreng: (ayam.stok_goreng || 0) + ayamPotongDipakai,
    }).eq("id", ayam.id);
    await supabase.from("stok_log").insert({
      bahan_id: ayam.id, tipe: "goreng", qty: ayamPotongDipakai,
      referensi: `Goreng harian ${jumlahBatch} batch (${ayamPakDipakai} pak = ${ayamPotongDipakai} potong)`,
    });

    if (tepung && tepungKgDipakai > 0) {
      await supabase.from("bahan_baku").update({ stok: tepung.stok - tepungKgDipakai }).eq("id", tepung.id);
      await supabase.from("stok_log").insert({
        bahan_id: tepung.id, tipe: "goreng", qty: -tepungKgDipakai,
        referensi: `Pakai ${tepungKgDipakai} kg untuk goreng harian ${jumlahBatch} batch`,
      });
    }

    if (minyak && minyakLDipakai > 0) {
      await supabase.from("bahan_baku").update({ stok: minyak.stok - minyakLDipakai }).eq("id", minyak.id);
      await supabase.from("stok_log").insert({
        bahan_id: minyak.id, tipe: "goreng", qty: -minyakLDipakai,
        referensi: `Pakai ${minyakLDipakai} L minyak untuk goreng harian`,
      });
    }

    await fetchBahanBaku();
    return { error: null };
  };

  const getWeeklyForecast = useCallback((safetyDays: number = 3): WeeklyForecastItem[] => {
    return bahanBaku
      .filter((b) => (b.avg_daily || 0) > 0)
      .map((b) => {
        const avgDaily = b.avg_daily || 0;
        const daysRemaining = Math.floor(b.stok / avgDaily);
        const stokBeli = Math.floor(b.stok / (b.isi_per_pak || 1));
        const avgDailyBeli = avgDaily / (b.isi_per_pak || 1);
        const orderByDate = new Date();
        orderByDate.setDate(orderByDate.getDate() + Math.max(0, daysRemaining - safetyDays));
        const stokNeeded = Math.ceil(avgDaily * (7 + safetyDays));
        const reorderQty = Math.max(0, stokNeeded - b.stok);
        const reorderQtyBeli = Math.ceil(reorderQty / (b.isi_per_pak || 1));
        const estHarga = reorderQtyBeli * (b.harga_beli || 0);
        const recommendedReorderPoint = Math.ceil(avgDaily * safetyDays);
        const recommendedReorderPointBeli = Math.ceil(recommendedReorderPoint / (b.isi_per_pak || 1));
        return {
          id: b.id, nama: b.nama, kategori: b.kategori,
          sat_beli: b.sat_beli, sat_dasar: b.sat_dasar, isi_per_pak: b.isi_per_pak || 1,
          harga_beli: b.harga_beli || 0,
          stokBeli, avgDailyBeli, daysRemaining, orderByDate,
          reorderQtyBeli, estHarga,
          isUrgent: daysRemaining <= safetyDays,
          recommendedReorderPoint, recommendedReorderPointBeli,
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [bahanBaku]);

  const applyReorderPoints = useCallback(async (safetyDays: number = 3) => {
    const updates = bahanBaku
      .filter((b) => (b.avg_daily || 0) > 0)
      .map((b) => {
        const recommended = Math.ceil((b.avg_daily || 0) * safetyDays);
        return supabase.from("bahan_baku").update({ reorder_point: recommended }).eq("id", b.id);
      });
    await Promise.all(updates);
    await fetchBahanBaku();
  }, [bahanBaku, fetchBahanBaku]);

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
    gorengHarian,
    getWeeklyForecast,
    applyReorderPoints,
    refresh: fetchBahanBaku,
  };
}
