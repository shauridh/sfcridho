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
import SortControl from "@/components/kasir/SortControl";
import OnlineOrders from "@/components/kasir/OnlineOrders";
import LoadingScreen from "@/components/LoadingScreen";
import { ShiftOpenModal, ShiftCloseModal } from "@/components/kasir/ShiftModals";
import { CartItem, Addon } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { useTotalSaldo } from "@/hooks/useTotalSaldo";
import { getSettings } from "@/lib/whatsapp";
import { sendWhatsApp, formatLaporanWA } from "@/lib/whatsapp";
import { ShoppingBag, Globe, X, Info, Wallet } from "lucide-react";

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
  const [onlineDelivery, setOnlineDelivery] = useState(false);
  const [shiftStats, setShiftStats] = useState({ totalTransaksi: 0, totalNominal: 0, totalQris: 0, kasKeluar: 0 });
  const [availableAddons, setAvailableAddons] = useState<Addon[]>([]);
  const [addonModal, setAddonModal] = useState<string | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [showSaldoDetail, setShowSaldoDetail] = useState(false);
  const { breakdown } = useTotalSaldo();
  const [sortField, setSortField] = useState<"nama" | "harga" | "kategori">("nama");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchShiftStats = useCallback(async () => {
    if (!activeShift) return;
    const { data } = await supabase.from("transaksi").select("total, metode_bayar").eq("shift_id", activeShift.id);
    const rows = (data || []) as { total: number; metode_bayar: string | null }[];
    const totalQris = rows.filter((t) => t.metode_bayar === "qris").reduce((s, t) => s + t.total, 0);
    
    // Hitung kas keluar dari drawer shift ini
    const bukaAt = new Date(activeShift.buka_at);
    const { data: kasData } = await supabase
      .from("kas")
      .select("nominal")
      .eq("tipe", "keluar")
      .gte("created_at", bukaAt.toISOString());
    const kasKeluar = (kasData || []).reduce((s, k) => s + k.nominal, 0);
    
    setShiftStats({ 
      totalTransaksi: rows.length, 
      totalNominal: rows.reduce((s, t) => s + t.total, 0), 
      totalQris,
      kasKeluar 
    });
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
    supabase.from("addons").select("*").eq("aktif", true).order("nama").then(({ data }) => {
      if (data) setAvailableAddons(data);
    });
    getSettings().then((s) => {
      setOnlineDelivery(s.online_delivery === "true");
    });
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

  const getCartItemPrice = (item: CartItem) => {
    const addonTotal = (item.addons || []).reduce((s, a) => s + a.harga, 0);
    return (item.produk.harga + addonTotal) * item.qty;
  };

  const filteredProduk = useMemo(() => {
    let list = filterKategori === "Semua" ? activeProduk : activeProduk.filter((p) => p.kategori === filterKategori);
    // Sort
    list = [...list].sort((a, b) => {
      let valA: string | number, valB: string | number;
      if (sortField === "harga") {
        valA = a.harga;
        valB = b.harga;
      } else if (sortField === "kategori") {
        valA = a.kategori;
        valB = b.kategori;
      } else {
        valA = a.nama;
        valB = b.nama;
      }
      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
    return list;
  }, [activeProduk, filterKategori, sortField, sortOrder]);
  
  const total = cart.reduce((sum, item) => sum + getCartItemPrice(item), 0);

  const addToCart = (produkId: string, addons?: { id: string; nama: string; harga: number }[]) => {
    const p = activeProduk.find((pr) => pr.id === produkId);
    if (!p) return;
    const addonKey = addons ? addons.map((a) => a.id).sort().join(",") : "";
    setCart((prev) => {
      const existing = prev.find((item) => item.produk.id === produkId && (item.addons ? item.addons.map((a) => a.id).sort().join(",") : "") === addonKey);
      if (existing) return prev.map((item) => item === existing ? { ...item, qty: item.qty + 1 } : item);
      return [...prev, { produk: p, qty: 1, addons }];
    });
  };

  const updateQty = (produkId: string, qty: number, addons?: { id: string; nama: string; harga: number }[]) => {
    const addonKey = addons ? addons.map((a) => a.id).sort().join(",") : "";
    if (qty <= 0) setCart((prev) => prev.filter((item) => !(item.produk.id === produkId && (item.addons ? item.addons.map((a) => a.id).sort().join(",") : "") === addonKey)));
    else setCart((prev) => prev.map((item) => item.produk.id === produkId && (item.addons ? item.addons.map((a) => a.id).sort().join(",") : "") === addonKey ? { ...item, qty } : item));
  };

  const clearCart = () => setCart([]);

  const handleBayar = async (bayar: number, metode: "tunai" | "qris") => {
    const { error, transaksiId } = await prosesPembayaran(
      cart, total, bayar, resepMap, metode, 
      activeShift?.id,
      undefined
    );
    if (!error && transaksiId) {
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

  const handleCloseShift = async (uangAmbil: number, uangAktual: number, totalQris: number) => {
    const shiftId = activeShift?.id;
    if (!activeShift) return { error: new Error("Tidak ada shift aktif") };

    const totalNominalTunai = shiftStats.totalNominal - shiftStats.totalQris;
    const selisih = uangAktual - (activeShift.uang_buka + totalNominalTunai - shiftStats.kasKeluar);
    
    // Tutup shift dengan uang drawer = aktual - ambil
    const { data: transaksiData } = await supabase
      .from("transaksi")
      .select("total")
      .eq("shift_id", activeShift.id);

    const totalTransaksi = transaksiData?.length || 0;
    const totalNominal = transaksiData?.reduce((s, t) => s + t.total, 0) || 0;
    const uangDrawer = uangAktual - uangAmbil;

    const { error } = await supabase
      .from("shift")
      .update({
        tutup_at: new Date().toISOString(),
        uang_drawer: uangDrawer,
        uang_ambil: uangAmbil,
        total_transaksi: totalTransaksi,
        total_nominal: totalNominal,
        status: "closed",
      })
      .eq("id", activeShift.id);

    if (error) return { error };
    setShowCloseShift(false);

    // Catat penarikan owner
    if (uangAmbil > 0) {
      await supabase.from("kas").insert({
        tipe: "keluar",
        nominal: uangAmbil,
        keterangan: `Penarikan kasir — ${new Date().toLocaleDateString("id-ID")}`,
        kategori: "Penarikan Kasir",
      });
    }
    
    // Catat selisih jika ada
    if (selisih !== 0) {
      await supabase.from("kas").insert({
        tipe: selisih > 0 ? "masuk" : "keluar",
        nominal: Math.abs(selisih),
        keterangan: `Selisih tutup kasir ${selisih > 0 ? "(lebih)" : "(kurang)"} — ${new Date().toLocaleDateString("id-ID")}`,
        kategori: "Selisih Kas",
      });
    }

    try {
      const settings = await getSettings();
      const apiKey = settings.wa_api_key;
      const phone = settings.wa_phone;

      if (apiKey && phone) {
        const laporan = await getLaporanHariIni();
        const storeName = settings.store_name || "Sabana FC";

        const msg = formatLaporanWA({
          storeName,
          date: new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          totalOmzet: laporan.totalOmzet,
          jumlahTransaksi: laporan.jumlahTransaksi,
          rataRata: laporan.rataRata,
          bestSellers: laporan.bestSellersList || [],
          kasMasuk: 0,
          kasKeluar: shiftStats.kasKeluar,
          metodeBayar: (laporan as any).metodeBayar,
          shiftInfo: { 
            uangBuka: activeShift.uang_buka, 
            uangAmbil, 
            uangDrawer, 
            uangAktual,
            selisih 
          },
          stokOpname: [],
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
    return { error: null };
  };

  if (loadingProduk || loadingShift) {
    return <LoadingScreen label="Memuat data..." />;
  }

  if (!isOpen) {
    return <ShiftOpenModal onBuka={bukaShift} loading={false} lastUangDrawer={lastUangDrawer} />;
  }

  return (
    <div className="flex h-full relative">
      <div className="flex-1 flex flex-col overflow-hidden p-3 md:p-4">
        <div className="space-y-2 mb-3 md:mb-4">
          <div className="flex items-center gap-2">
            <KategoriBar kategoriList={kategoriList} active={filterKategori} onSelect={setFilterKategori} onReorder={handleReorderKategori} />
            {onlineDelivery && (
              <button
                onClick={() => setShowOnlineOrders(!showOnlineOrders)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors touch-target ${showOnlineOrders ? "th-accent-bg text-white" : "th-card border th-border th-muted hover:th-text"}`}
              >
                <Globe size={14} /> Online
              </button>
            )}
          </div>
          <SortControl 
            field={sortField} 
            order={sortOrder} 
            onChangeField={setSortField} 
            onToggleOrder={() => setSortOrder(o => o === "asc" ? "desc" : "asc")} 
          />
        </div>

        {showOnlineOrders && (
          <div className="mb-3 md:mb-4 th-card border th-border rounded-2xl p-3 md:p-4 max-h-[300px] overflow-auto">
            <OnlineOrders />
          </div>
        )}

        <ProductGrid produk={filteredProduk} onAdd={(produkId) => {
          const p = activeProduk.find((pr) => pr.id === produkId);
          if (availableAddons.length > 0 && p?.has_addons) {
            setAddonModal(produkId);
            setSelectedAddons([]);
          } else {
            addToCart(produkId);
          }
        }} />
      </div>

      <div className="hidden md:block w-[38%] min-w-[320px] border-l th-border">
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
        <div className="md:hidden fixed inset-0 z-50 flex flex-col transition-all duration-300 ease-out" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div className="flex-1" onClick={() => setShowMobileCart(false)} />
          <div className="th-card border-t th-border rounded-t-2xl max-h-[80vh] flex flex-col transform transition-transform duration-300 ease-out translate-y-0">
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
          totalNominalHariIni={shiftStats.totalNominal - shiftStats.totalQris}
          totalQrisHariIni={shiftStats.totalQris}
          kasKeluarHariIni={shiftStats.kasKeluar}
          onTutup={handleCloseShift}
          onClose={() => setShowCloseShift(false)}
          loading={false}
        />
      )}

      {addonModal && (() => {
        const p = activeProduk.find((pr) => pr.id === addonModal);
        if (!p) return null;
        return (
          <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4">
            <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between p-5 border-b th-border">
                <div>
                  <h2 className="text-lg font-bold th-text">{p.nama}</h2>
                  <p className="text-xs th-accent font-bold">{formatRupiah(p.harga)}</p>
                </div>
                <button onClick={() => { setAddonModal(null); setSelectedAddons([]); }} className="p-2 th-muted hover:th-text"><X size={20} /></button>
              </div>
              <div className="p-5 space-y-3">
                <p className="text-xs font-semibold th-muted uppercase">Tambah Addon (opsional)</p>
                <div className="space-y-2 max-h-48 overflow-auto">
                  {availableAddons.map((a) => {
                    const isSelected = selectedAddons.includes(a.id);
                    return (
                      <button key={a.id} onClick={() => {
                        setSelectedAddons((prev) => isSelected ? prev.filter((id) => id !== a.id) : [...prev, a.id]);
                      }} className={`flex items-center justify-between w-full px-4 py-3 rounded-xl border text-sm transition-colors touch-target ${isSelected ? "border-accent bg-red-50 dark:bg-red-950/20" : "th-border hover:border-accent"}`}>
                        <span className={isSelected ? "font-semibold th-text" : "th-text-secondary"}>{a.nama}</span>
                        <span className={isSelected ? "font-semibold th-accent" : "th-muted"}>+{formatRupiah(a.harga)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { addToCart(addonModal); setAddonModal(null); setSelectedAddons([]); }} className="flex-1 py-3.5 border th-border rounded-xl text-sm font-medium th-muted touch-target">Tanpa Addon</button>
                  <button onClick={() => {
                    const addons = availableAddons.filter((a) => selectedAddons.includes(a.id));
                    addToCart(addonModal, addons);
                    setAddonModal(null);
                    setSelectedAddons([]);
                  }} className="flex-1 py-3.5 th-accent-bg text-white rounded-xl font-bold touch-target">
                    Tambah{selectedAddons.length > 0 ? ` (+${formatRupiah(availableAddons.filter((a) => selectedAddons.includes(a.id)).reduce((s, a) => s + a.harga, 0))})` : ""}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      
      {showSaldoDetail && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4" onClick={() => setShowSaldoDetail(false)}>
          <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={18} className="th-accent" />
              <h3 className="text-base font-bold th-text">Rincian Total Saldo</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">💰 Drawer (Shift Aktif)</span>
                <span className="font-semibold th-text">{breakdown.drawerFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">+ Kas Masuk (Manual)</span>
                <span className="font-semibold text-success">{breakdown.kasMasukFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">− Kas Keluar (Manual)</span>
                <span className="font-semibold text-danger">-{breakdown.kasKeluarFormatted}</span>
              </div>
              <div className="flex justify-between py-2 border-b th-border/30">
                <span className="th-text-secondary">🏦 Bank / E-Wallet</span>
                <span className="font-semibold th-text">{formatRupiah(breakdown.akunBank + breakdown.akunEwallet + breakdown.akunKasFisik)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 th-border">
                <span className="font-bold th-text">Total Saldo</span>
                <span className="text-lg font-bold th-accent">{breakdown.totalFormatted}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
