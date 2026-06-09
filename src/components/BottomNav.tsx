"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, UtensilsCrossed, Wallet, Settings, Lock } from "lucide-react";
import { useShiftAction } from "@/components/ShiftActionContext";
import { clsx } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/kasir", label: "Kasir", icon: ShoppingCart },
  { href: "/stok", label: "Stok", icon: Package },
  { href: "/produk", label: "Produk", icon: UtensilsCrossed },
  { href: "/kas", label: "Kas", icon: Wallet },
  { href: "/pengaturan", label: "Atur", icon: Settings },
];

interface Props {
  alertCount: number;
}

export default function BottomNav({ alertCount }: Props) {
  const pathname = usePathname();
  const { showTutupShift, onTutupShift } = useShiftAction();

  return (
    <nav className="fixed bottom-0 left-0 right-0 th-sidebar border-t th-border flex items-center justify-around py-1 z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        const showBadge = item.href === "/stok" && alertCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "relative flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-all touch-target",
              isActive ? "th-accent" : "th-muted"
            )}
          >
            <Icon size={20} />
            {showBadge && (
              <span className="absolute -top-0.5 right-0 w-4 h-4 bg-danger text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {alertCount > 9 ? "9+" : alertCount}
              </span>
            )}
            <span className="text-[9px] mt-0.5 font-medium">{item.label}</span>
          </Link>
        );
      })}
      {showTutupShift && onTutupShift && (
        <button
          onClick={onTutupShift}
          aria-label="Tutup kasir"
          className="flex flex-col items-center justify-center py-1.5 px-2 rounded-lg text-danger touch-target"
        >
          <Lock size={20} />
          <span className="text-[9px] mt-0.5 font-medium">Tutup</span>
        </button>
      )}
    </nav>
  );
}
