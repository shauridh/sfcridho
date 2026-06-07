"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Kategori } from "@/lib/types";

export function useKategori(tipe: "stok" | "produk") {
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKategori = useCallback(async () => {
    const { data, error } = await supabase
      .from("kategori")
      .select("*")
      .eq("tipe", tipe)
      .order("urutan");

    if (!error && data) setKategoriList(data);
    setLoading(false);
  }, [tipe]);

  useEffect(() => { fetchKategori(); }, [fetchKategori]);

  const tambahKategori = async (nama: string) => {
    const maxUrutan = kategoriList.reduce((max, k) => Math.max(max, k.urutan), 0);
    const { error } = await supabase.from("kategori").insert({ nama, tipe, urutan: maxUrutan + 1 });
    if (!error) await fetchKategori();
    return { error };
  };

  const editKategori = async (id: string, nama: string) => {
    const { error } = await supabase.from("kategori").update({ nama }).eq("id", id);
    if (!error) await fetchKategori();
    return { error };
  };

  const hapusKategori = async (id: string) => {
    const { error } = await supabase.from("kategori").delete().eq("id", id);
    if (!error) await fetchKategori();
    return { error };
  };

  const namaList = kategoriList.map((k) => k.nama);

  return {
    kategoriList,
    namaList,
    loading,
    tambahKategori,
    editKategori,
    hapusKategori,
    refresh: fetchKategori,
  };
}
