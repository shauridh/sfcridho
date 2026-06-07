"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { BahanBaku, getStokStatus } from "@/lib/types";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";
import AlertBanner from "@/components/AlertBanner";
import PINModal from "@/components/PINModal";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { pinVerified, verifyPin, isProtectedRoute } = useAuth();
  const [showPin, setShowPin] = useState(false);
  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>([]);

  useEffect(() => {
    let active = true;
    supabase.from("bahan_baku").select("*").order("nama").then(({ data }) => {
      if (active && data) setBahanBaku(data);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isProtectedRoute(pathname) && !pinVerified) {
      setShowPin(true);
    } else {
      setShowPin(false);
    }
  }, [pathname, pinVerified, isProtectedRoute]);

  const alertCount = bahanBaku.filter((b) => getStokStatus(b.stok, b.reorder_point) !== "aman").length;

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar alertCount={alertCount} />
      </div>

      <main className="flex-1 md:ml-16 flex flex-col overflow-hidden">
        <AlertBanner bahanBaku={bahanBaku} />
        <div className="flex-1 overflow-auto pb-16 md:pb-0">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden">
        <BottomNav alertCount={alertCount} />
      </div>

      {showPin && (
        <PINModal
          title={pathname.startsWith("/pengaturan") ? "PIN Pengaturan" : "PIN Kas"}
          onClose={() => { setShowPin(false); router.push("/dashboard"); }}
          onVerify={verifyPin}
        />
      )}
    </div>
  );
}
