"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Kas } from "@/lib/types";

export function useKas() {
  const [kasList, setKasList] = useState<Kas[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalKasAll, setTotalKasAll] = useState(0);

  const fetchKas = useCallback(async (date?: Date) => {
    setLoading(true);
    const targetDate = date || new Date();
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const { data, error } = await supabase
      .from("kas")
      .select("*")
      .gte("waktu", start.toISOString())
      .lt("waktu", end.toISOString())
      .order("waktu", { ascending: false });

    if (!error && data) setKasList(data);
    setLoading(false);
  }, []);

  const fetchTotalKasAll = useCallback(async () => {
    const { data } = await supabase.from("kas").select("tipe, nominal");
    if (!data) return;
    const masuk = data.filter((k) => k.tipe === "masuk").reduce((s, k) => s + k.nominal, 0);
    const keluar = data.filter((k) => k.tipe === "keluar").reduce((s, k) => s + k.nominal, 0);
    setTotalKasAll(masuk - keluar);
  }, []);

  useEffect(() => {
    fetchTotalKasAll();
  }, [fetchTotalKasAll]);

  const tambahKas = async (data: Omit<Kas, "id" | "waktu">) => {
    const { error } = await supabase.from("kas").insert(data);
    if (!error) {
      await fetchKas();
      await fetchTotalKasAll();
    }
    return { error };
  };

  const hapusKas = async (id: string) => {
    const { error } = await supabase.from("kas").delete().eq("id", id);
    if (!error) {
      await fetchKas();
      await fetchTotalKasAll();
    }
    return { error };
  };

  const refresh = useCallback((date?: Date) => {
    fetchKas(date);
    fetchTotalKasAll();
  }, [fetchKas, fetchTotalKasAll]);

  const totalMasuk = kasList.filter((k) => k.tipe === "masuk").reduce((s, k) => s + k.nominal, 0);
  const totalKeluar = kasList.filter((k) => k.tipe === "keluar").reduce((s, k) => s + k.nominal, 0);

  return {
    kasList,
    loading,
    totalMasuk,
    totalKeluar,
    selisih: totalMasuk - totalKeluar,
    totalKasAll,
    tambahKas,
    hapusKas,
    refresh,
  };
}
