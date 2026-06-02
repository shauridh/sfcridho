"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { BahanBaku, getStokStatus } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import AlertBanner from "@/components/AlertBanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isLoginPage = pathname === "/login";

  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>([]);

  useEffect(() => {
    if (authLoading || isLoginPage || !user) return;
    let active = true;
    supabase.from("bahan_baku").select("*").order("nama").then(({ data }) => {
      if (active && data) setBahanBaku(data);
    });
    return () => { active = false; };
  }, [user?.id, isLoginPage, authLoading]);

  useEffect(() => {
    if (!authLoading && !user && !isLoginPage) {
      router.replace("/login");
    }
  }, [user, authLoading, isLoginPage, router]);

  const alertCount = bahanBaku.filter((b) => getStokStatus(b.stok, b.reorder_point) !== "aman").length;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center th-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar alertCount={alertCount} />
      <main className="flex-1 ml-16 flex flex-col overflow-hidden">
        <AlertBanner bahanBaku={bahanBaku} />
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
