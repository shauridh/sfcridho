"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { BahanBaku } from "@/lib/types";

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

  const alertCount = bahanBaku.filter(
    (b) => b.stok <= b.reorder_point
  ).length;

  return {
    bahanBaku,
    loading,
    alertCount,
    tambahBahan,
    editBahan,
    hapusBahan,
    restock,
    refresh: fetchBahanBaku,
  };
}
