"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Produk, Resep } from "@/lib/types";

export function useProduk() {
  const [produk, setProduk] = useState<Produk[]>([]);
  const [resepMap, setResepMap] = useState<Record<string, Resep[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchProduk = useCallback(async () => {
    const { data, error } = await supabase
      .from("produk")
      .select("*")
      .order("kategori")
      .order("nama");

    if (!error && data) {
      setProduk(data);
    }
    setLoading(false);
  }, []);

  const fetchResep = useCallback(async () => {
    const { data, error } = await supabase.from("resep").select("*");
    if (!error && data) {
      const map: Record<string, Resep[]> = {};
      data.forEach((r) => {
        if (!map[r.produk_id]) map[r.produk_id] = [];
        map[r.produk_id].push(r);
      });
      setResepMap(map);
    }
  }, []);

  useEffect(() => {
    fetchProduk();
    fetchResep();
  }, [fetchProduk, fetchResep]);

  const tambahProduk = async (
    p: Omit<Produk, "id" | "created_at">,
    resepItems: Omit<Resep, "id" | "produk_id">[]
  ) => {
    const { data, error } = await supabase
      .from("produk")
      .insert(p)
      .select()
      .single();

    if (error || !data) return { error };

    if (resepItems.length > 0) {
      const resepData = resepItems.map((r) => ({
        ...r,
        produk_id: data.id,
      }));
      await supabase.from("resep").insert(resepData);
    }

    await fetchProduk();
    await fetchResep();
    return { error: null };
  };

  const editProduk = async (
    id: string,
    p: Partial<Produk>,
    resepItems?: Omit<Resep, "id" | "produk_id">[]
  ) => {
    const { error } = await supabase.from("produk").update(p).eq("id", id);
    if (error) return { error };

    if (resepItems !== undefined) {
      await supabase.from("resep").delete().eq("produk_id", id);
      if (resepItems.length > 0) {
        const resepData = resepItems.map((r) => ({
          ...r,
          produk_id: id,
        }));
        await supabase.from("resep").insert(resepData);
      }
    }

    await fetchProduk();
    await fetchResep();
    return { error: null };
  };

  const toggleAktif = async (id: string, aktif: boolean) => {
    const { error } = await supabase
      .from("produk")
      .update({ aktif })
      .eq("id", id);
    if (!error) await fetchProduk();
    return { error };
  };

  const hapusProduk = async (id: string) => {
    const { error } = await supabase.from("produk").delete().eq("id", id);
    if (!error) {
      await fetchProduk();
      await fetchResep();
    }
    return { error };
  };

  const uploadGambar = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from("produk-images")
      .upload(fileName, file);
    if (error || !data) return null;
    const { data: urlData } = supabase.storage
      .from("produk-images")
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const hapusGambar = async (url: string) => {
    const path = url.split("/produk-images/")[1];
    if (path) await supabase.storage.from("produk-images").remove([path]);
  };

  return {
    produk,
    resepMap,
    loading,
    tambahProduk,
    editProduk,
    toggleAktif,
    hapusProduk,
    uploadGambar,
    hapusGambar,
    refresh: () => {
      fetchProduk();
      fetchResep();
    },
  };
}
