"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Addon } from "@/lib/types";

export function useAddon() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAddons = useCallback(async () => {
    const { data, error } = await supabase.from("addons").select("*").order("nama");
    if (!error && data) setAddons(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAddons(); }, [fetchAddons]);

  const tambahAddon = async (nama: string, harga: number) => {
    const { error } = await supabase.from("addons").insert({ nama, harga });
    if (!error) await fetchAddons();
    return { error };
  };

  const editAddon = async (id: string, data: { nama?: string; harga?: number; aktif?: boolean }) => {
    const { error } = await supabase.from("addons").update(data).eq("id", id);
    if (!error) await fetchAddons();
    return { error };
  };

  const hapusAddon = async (id: string) => {
    const { error } = await supabase.from("addons").delete().eq("id", id);
    if (!error) await fetchAddons();
    return { error };
  };

  const activeAddons = addons.filter((a) => a.aktif);

  return { addons, activeAddons, loading, tambahAddon, editAddon, hapusAddon, refresh: fetchAddons };
}
