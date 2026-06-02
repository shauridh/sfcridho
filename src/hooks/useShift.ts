"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Shift } from "@/lib/types";

export function useShift() {
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [lastUangDrawer, setLastUangDrawer] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchActiveShift = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("shift")
      .select("*")
      .eq("status", "open")
      .order("buka_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setActiveShift(data);
    } else {
      setActiveShift(null);
    }

    const { data: lastClosed } = await supabase
      .from("shift")
      .select("uang_drawer")
      .eq("status", "closed")
      .order("tutup_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setLastUangDrawer(lastClosed?.uang_drawer || 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchActiveShift();
  }, [fetchActiveShift]);

  const bukaShift = async (uangBuka: number) => {
    const { data, error } = await supabase
      .from("shift")
      .insert({ uang_buka: uangBuka })
      .select()
      .single();

    if (!error && data) {
      setActiveShift(data);
    }
    return { error, data };
  };

  const tutupShift = async (uangAmbil: number) => {
    if (!activeShift) return { error: new Error("Tidak ada shift aktif") };

    const { data: transaksiData } = await supabase
      .from("transaksi")
      .select("total")
      .eq("shift_id", activeShift.id);

    const totalTransaksi = transaksiData?.length || 0;
    const totalNominal = transaksiData?.reduce((s, t) => s + t.total, 0) || 0;
    const uangDrawer = activeShift.uang_buka + totalNominal - uangAmbil;

    const { error } = await supabase
      .from("shift")
      .update({
        tutup_at: new Date().toISOString(),
        uang_drawer: uangDrawer,
        uang_ambil: uangAmbil,
        total_transaksi: totalTransaksi,
        total_nominal: totalNominal,
        status: "closed",
      })
      .eq("id", activeShift.id);

    if (!error) {
      setActiveShift(null);
    }
    return { error };
  };

  const getRiwayatShift = useCallback(async () => {
    const { data } = await supabase
      .from("shift")
      .select("*")
      .order("buka_at", { ascending: false })
      .limit(30);
    return data || [];
  }, []);

  return {
    activeShift,
    loading,
    isOpen: activeShift !== null,
    lastUangDrawer,
    bukaShift,
    tutupShift,
    getRiwayatShift,
    refresh: fetchActiveShift,
  };
}
