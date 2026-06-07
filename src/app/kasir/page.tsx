"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProduk } from "@/hooks/useProduk";
import { useTransaksi } from "@/hooks/useTransaksi";
import { useShift } from "@/hooks/useShift";
import { useShiftAction } from "@/components/ShiftActionContext";
import ProductGrid from "@/components/kasir/ProductGrid";
import Cart from "@/components/kasir/Cart";
import PaymentModal from "@/components/kasir/PaymentModal";
import ReceiptStruk from "@/components/kasir/ReceiptStruk";
import KategoriBar from "@/components/kasir/KategoriBar";
import OnlineOrders from "@/components/kasir/OnlineOrders";
import { ShiftOpenModal, ShiftCloseModal } from "@/components/kasir/ShiftModals";
import { CartItem } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { getSettings } from "@/lib/whatsapp";
import { sendWhatsApp, formatLaporanWA } from "@/lib/whatsapp";
import { ShoppingBag, Globe } from "lucide-react";

interface ReceiptData {
  items: CartItem[];
  total: number;
  bayar: number;
  kembalian: number;
  transaksiId: string;
  waktu: Date;
  metode: "tunai" | "qris";
}

export default function KasirPage() {
  const { produk, resepMap, loading: loadingProduk } = useProduk();
  const { loading: loadingTransaksi, prosesPembayaran, getLaporanHariIni } = useTransaksi();
  const { activeShift, isOpen, loading: loadingShift, lastUangDrawer, bukaShift, tutupShift } = useShift();
  const { registerCloseAction, unregisterCloseAction } = useShiftAction();
  const router = useRouter();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [kategoriOrder, setKategoriOrder] = useState<string[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showOnlineOrders, setShowOnlineOrders] = useState(false);
  const [shiftStats, setShiftStats] = useState({ totalTransaksi: 0, totalNominal: 0 });

  const fetchShiftStats = useCallback(async () => {
    if (!activeShift) return;
    const { data } = await supabase.from("transaksi").select("total").eq("shift_id", activeShift.id);
    setShiftStats({ totalTransaksi: data?.length || 0, totalNominal: data?.reduce((s, t) => s + t.total, 0) || 0 });
  }, [activeShift]);

  useEffect(() => { fetchShiftStats(); }, [fetchShiftStats]);

  useEffect(() => {
    if (isOpen) {
      registerCloseAction(() => setShowCloseShift(true));
    } else {
      unregisterCloseAction();
    }
    return () => unregisterCloseAction();
  }, [isOpen, registerCloseAction, unregisterCloseAction]);

  useEffect(() => {
    const loadKategoriOrder = async () => {
      const { data } = await supabase.from("kategori_order").select("nama, urutan").order("urutan");
      if (data && data.length > 0) {
        setKategoriOrder(data.map((d) => d.nama));
      }
    };
    loadKategoriOrder();
  }, []);

  const activeProduk = useMemo(() => produk.filter((p) => p.aktif), [produk]);

  const kategoriList = useMemo(() => {
    const fromProduk = Array.from(new Set(activeProduk.map((p) => p.kategori)));
    if (kategoriOrder.length > 0) {
      const ordered = kategoriOrder.filter((k) => fromProduk.includes(k));
      const extras = fromProduk.filter((k) => !kategoriOrder.includes(k));
      return ["Semua", ...ordered, ...extras];
    }
    return ["Semua", ...fromProduk];
  }, [activeProduk, kategoriOrder]);

  const filteredProduk = filterKategori === "Semua" ? activeProduk : activeProduk.filter((p) => p.kategori === filterKategori);
  const total = cart.reduce((sum, item) => sum + item.produk.harga * item.qty, 0);

  const addToCart = (produkId: string) => {
    const p = activeProduk.find((pr) => pr.id === produkId);
    if (!p) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.produk.id === produkId);
      if (existing) return prev.map((item) => item.produk.id === produkId ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { produk: p, qty: 1 }];
    });
  };

  const updateQty = (produkId: string, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((item) => item.produk.id !== produkId));
    else setCart((prev) => prev.map((item) => item.produk.id === produkId ? { ...item, qty } : item));
  };

  const clearCart = () => setCart([]);

  const handleBayar = async (bayar: number, metode: "tunai" | "qris") => {
    const { error, transaksiId } = await prosesPembayaran(cart, total, bayar, resepMap, metode);
    if (!error && transaksiId) {
      if (activeShift) await supabase.from("transaksi").update({ shift_id: activeShift.id }).eq("id", transaksiId);
      setReceipt({ items: [...cart], total, bayar, kembalian: bayar - total, transaksiId, waktu: new Date(), metode });
      setCart([]);
      setShowPayment(false);
      fetchShiftStats();
    }
    return { error, transaksiId };
  };

  const handleReorderKategori = async (newOrder: string[]) => {
    setKategoriOrder(newOrder);
    const filtered = newOrder.filter((k) => k !== "Semua");
    await supabase.from("kategori_order").delete().neq("nama", "__none__");
    const rows = filtered.map((nama, idx) => ({ nama, urutan: idx + 1 }));
    if (rows.length > 0) await supabase.from("kategori_order").insert(rows);
  };

  const handleCloseShift = async (uangAmbil: number) => {
    const shiftId = activeShift?.id;
    const uangBuka = activeShift?.uang_buka || 0;
    const res = await tutupShift(uangAmbil);
    if (!res.error) {
      setShowCloseShift(false);

      if (uangAmbil > 0 && shiftId) {
        await supabase.from("kas").insert({
          tipe: "masuk",
          nominal: uangAmbil,
          keterangan: `Penarikan kasir — shift ${shiftId.slice(0, 8)}`,
          kategori: "Penarikan Kasir",
        });
      }

      try {
        const settings = await getSettings();
        const apiKey = settings.wa_api_key;
        const phone = settings.wa_phone;

        if (apiKey && phone) {
          const laporan = await getLaporanHariIni();
          const storeName = settings.store_name || "Sabana FC";

          const { data: stokData } = await supabase.from("bahan_baku").select("nama, stok, sat_dasar, reorder_point").order("nama");
          const stokOpname = (stokData || []).map((b: any) => ({
            nama: b.nama,
            stok: b.stok,
            sat: b.sat_dasar,
            status: b.stok <= 0 ? "habis" : b.stok <= b.reorder_point * 0.5 ? "kritis" : b.stok <= b.reorder_point ? "rendah" : "aman",
          }));

          const msg = formatLaporanWA({
            storeName,
            date: new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
            totalOmzet: laporan.totalOmzet,
            jumlahTransaksi: laporan.jumlahTransaksi,
            rataRata: laporan.rataRata,
            bestSellers: laporan.bestSellersList || [],
            kasMasuk: 0,
            kasKeluar: 0,
            metodeBayar: (laporan as any).metodeBayar,
            shiftInfo: shiftId ? { uangBuka, uangAmbil, uangDrawer: uangBuka + laporan.totalOmzet - uangAmbil } : undefined,
            stokOpname,
          });
          const waResult = await sendWhatsApp(msg);
          console.log("WA send result:", waResult);
        } else {
          console.log("WA not configured: api_key or phone missing");
        }
      } catch (err) {
        console.error("WA notification error:", err);
      }

      router.push("/dashboard");
    }
    return res;
  };

  if (loadingProduk || loadingShift) {
    return <div className="flex items-center justify-center h-full"><div className="th-muted">Memuat data...</div></div>;
  }

  if (!isOpen) {
    return <ShiftOpenModal onBuka={bukaShift} loading={false} lastUangDrawer={lastUangDrawer} />;
  }

  return (
    <div className="flex h-full relative">
      <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <div className="flex-1 overflow-hidden">
            <KategoriBar kategoriList={kategoriList} active={filterKategori} onSelect={setFilterKategori} onReorder={handleReorderKategori} />
          </div>
          <button
            onClick={() => setShowOnlineOrders(!showOnlineOrders)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors touch-target ${showOnlineOrders ? "th-accent-bg text-white" : "th-card border th-border th-muted hover:th-text"}`}
          >
            <Globe size={14} /> Online
          </button>
        </div>

        {showOnlineOrders && (
          <div className="mb-3 md:mb-4 th-card border th-border rounded-2xl p-3 md:p-4 max-h-[300px] overflow-auto">
            <OnlineOrders />
          </div>
        )}

        <ProductGrid produk={filteredProduk} onAdd={addToCart} />
      </div>

      <div className="hidden md:block w-[42%] min-w-[320px] border-l th-border">
        <Cart items={cart} total={total} onUpdateQty={updateQty} onClear={clearCart} onBayar={() => setShowPayment(true)} />
      </div>

      {cart.length > 0 && (
        <button
          onClick={() => setShowMobileCart(true)}
          className="md:hidden fixed bottom-20 right-4 z-40 th-accent-bg text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <ShoppingBag size={22} />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-white th-accent text-[10px] font-bold rounded-full flex items-center justify-center border-2 th-accent-bg">
            {cart.reduce((s, i) => s + i.qty, 0)}
          </span>
        </button>
      )}

      {showMobileCart && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/40" onClick={() => setShowMobileCart(false)} />
          <div className="th-card border-t th-border rounded-t-2xl max-h-[80vh] flex flex-col">
            <Cart items={cart} total={total} onUpdateQty={updateQty} onClear={() => { clearCart(); setShowMobileCart(false); }} onBayar={() => { setShowMobileCart(false); setShowPayment(true); }} />
          </div>
        </div>
      )}

      {showPayment && <PaymentModal total={total} onClose={() => setShowPayment(false)} onBayar={handleBayar} loading={loadingTransaksi} />}
      {receipt && <ReceiptStruk receipt={receipt} onClose={() => setReceipt(null)} />}
      {showCloseShift && activeShift && (
        <ShiftCloseModal
          shift={activeShift}
          totalTransaksiHariIni={shiftStats.totalTransaksi}
          totalNominalHariIni={shiftStats.totalNominal}
          onTutup={handleCloseShift}
          onClose={() => setShowCloseShift(false)}
          loading={false}
        />
      )}
    </div>
  );
}
