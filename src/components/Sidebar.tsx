"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, UtensilsCrossed, Wallet, Sun, Moon, Settings, Lock, LogOut } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import { useShiftAction } from "@/components/ShiftActionContext";
import { useAuth } from "@/components/AuthProvider";
import { clsx } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kasir", label: "Kasir", icon: ShoppingCart },
  { href: "/stok", label: "Stok", icon: Package },
  { href: "/produk", label: "Produk", icon: UtensilsCrossed },
  { href: "/kas", label: "Kas", icon: Wallet },
];

interface SidebarProps {
  alertCount: number;
}

export default function Sidebar({ alertCount }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const { showTutupShift, onTutupShift } = useShiftAction();
  const { currentUser, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-16 th-sidebar border-r th-border flex flex-col items-center py-4 z-50 shadow-sm">
      <div className="mb-6 th-accent font-bold text-xl">S</div>
      <nav className="flex flex-col gap-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          const showBadge = item.href === "/stok" && alertCount > 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all touch-target",
                isActive
                  ? "th-sidebar-active th-accent border th-border"
                  : "th-muted hover:th-text hover:th-surface"
              )}
              title={item.label}
            >
              <Icon size={22} />
              {showBadge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
              <span className="text-[9px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 mt-auto">
        {showTutupShift && onTutupShift && (
          <button
            onClick={onTutupShift}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all touch-target text-danger hover:bg-red-50 dark:hover:bg-red-950/30 border border-danger/30"
            title="Tutup Kasir"
          >
            <Lock size={18} />
            <span className="text-[9px] mt-0.5 font-medium">Tutup</span>
          </button>
        )}
        <Link
          href="/pengaturan"
          className={clsx(
            "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all touch-target",
            pathname.startsWith("/pengaturan")
              ? "th-sidebar-active th-accent border th-border"
              : "th-muted hover:th-text hover:th-surface"
          )}
          title="Pengaturan"
        >
          <Settings size={20} />
          <span className="text-[9px] mt-0.5 font-medium">Atur</span>
        </Link>
        <button
          onClick={toggle}
          className="w-10 h-10 rounded-xl flex items-center justify-center th-muted hover:th-text hover:th-surface transition-all touch-target mx-auto"
          title={theme === "light" ? "Mode Gelap" : "Mode Terang"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        {currentUser && (
          <button
            onClick={logout}
            className="w-10 h-10 rounded-xl flex items-center justify-center th-muted hover:text-danger hover:th-surface transition-all touch-target mx-auto"
            title={`Keluar (${currentUser.nama})`}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
