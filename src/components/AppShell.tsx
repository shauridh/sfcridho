"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { BahanBaku, getStokStatus } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import AlertBanner from "@/components/AlertBanner";

const PUBLIC_ROUTES = ["/login", "/order"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>([]);

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  useEffect(() => {
    if (!currentUser && !isPublic) {
      router.replace("/login");
    }
    if (currentUser && pathname.startsWith("/login")) {
      router.replace("/dashboard");
    }
  }, [currentUser, pathname, isPublic, router]);

  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    supabase.from("bahan_baku").select("*").order("nama").then(({ data }) => {
      if (active && data) setBahanBaku(data);
    });
    return () => { active = false; };
  }, [currentUser]);

  if (!currentUser && !isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center th-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isPublic) {
    return <>{children}</>;
  }

  const alertCount = bahanBaku.filter((b) => getStokStatus(b.stok, b.reorder_point) !== "aman").length;

  const isKasir = pathname === "/kasir";

  return (
    <div className="flex h-dvh overflow-hidden">
      {!isKasir && (
        <div className="hidden md:block">
          <Sidebar alertCount={alertCount} />
        </div>
      )}

      <main className={`flex-1 flex flex-col overflow-hidden ${isKasir ? "" : "md:ml-16"}`}>
        {pathname !== "/kasir" && <AlertBanner bahanBaku={bahanBaku} />}
        <div className={`flex-1 overflow-auto ${isKasir ? "" : "pb-16 md:pb-0"}`}>{children}</div>
      </main>

      {!isKasir && (
        <div className="md:hidden">
          <BottomNav alertCount={alertCount} />
        </div>
      )}
    </div>
  );
}
