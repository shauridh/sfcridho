"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { Plus, Minus, Trash2, ShoppingCart, Send, CheckCircle, MapPin, ChevronDown, ChevronRight, X } from "lucide-react";
import { sendWhatsApp, getPublicSettings, getWATemplates, fillTemplate } from "@/lib/whatsapp";

interface MenuItem {
  id: string;
  nama: string;
  harga: number;
  kategori: string;
  has_addons?: boolean;
}

interface CartItem extends MenuItem {
  qty: number;
  addons?: { id: string; nama: string; harga: number }[];
}

interface AddonItem {
  id: string;
  nama: string;
  harga: number;
}

export default function OrderPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [nama, setNama] = useState("");
  const [phone, setPhone] = useState("");
  const [alamat, setAlamat] = useState("");
  const [catatan, setCatatan] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [collapsedKategori, setCollapsedKategori] = useState<Set<string>>(new Set());
  const [ongkir, setOngkir] = useState(0);
  const [availableAddons, setAvailableAddons] = useState<AddonItem[]>([]);
  const [addonModal, setAddonModal] = useState<MenuItem | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("produk").select("id, nama, harga, kategori, has_addons").eq("aktif", true).order("kategori").order("nama").then(({ data }) => {
      if (data) setMenu(data);
    });
    supabase.from("addons").select("id, nama, harga").eq("aktif", true).order("nama").then(({ data }) => {
      if (data) setAvailableAddons(data);
    });
    getPublicSettings().then((s) => {
      setOngkir(parseInt(s.ongkir) || 0);
    });
  }, []);

  const kategoriList = ["Semua", ...Array.from(new Set(menu.map((m) => m.kategori)))];
  const filtered = filterKategori === "Semua" ? menu : menu.filter((m) => m.kategori === filterKategori);

  const addToCart = (item: MenuItem, addons?: { id: string; nama: string; harga: number }[]) => {
    const addonKey = addons ? addons.map((a) => a.id).sort().join(",") : "";
    const existing = cart.find((c) => c.id === item.id && (c.addons ? c.addons.map((a) => a.id).sort().join(",") : "") === addonKey);
    if (existing) {
      setCart(cart.map((c) => c === existing ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart([...cart, { ...item, qty: 1, addons }]);
    }
  };

  const getItemPrice = (item: CartItem) => {
    const addonTotal = (item.addons || []).reduce((s, a) => s + a.harga, 0);
    return (item.harga + addonTotal) * item.qty;
  };

  const getCartKey = (c: CartItem) => `${c.id}-${(c.addons || []).map((a) => a.id).sort().join(",")}`;

  const updateQty = (key: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((c) => getCartKey(c) !== key));
    } else {
      setCart(cart.map((c) => getCartKey(c) === key ? { ...c, qty } : c));
    }
  };

  const subtotal = cart.reduce((s, c) => s + getItemPrice(c), 0);
  const total = subtotal + ongkir;

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Browser tidak mendukung GPS");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const url = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
        setLocationUrl(url);
        setLocating(false);
      },
      (err) => {
        alert("Gagal mengambil lokasi: " + err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !phone.trim() || !alamat.trim() || cart.length === 0) {
      setError("Nama, nomor WA, alamat, dan pesanan wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const items = cart.map((c) => {
        const addonTotal = (c.addons || []).reduce((s, a) => s + a.harga, 0);
        const addonNames = (c.addons || []).map((a) => a.nama).join(", ");
        return {
          nama: addonNames ? `${c.nama} + ${addonNames}` : c.nama,
          qty: c.qty,
          harga: c.harga + addonTotal,
          subtotal: (c.harga + addonTotal) * c.qty,
        };
      });
      const { error: err } = await supabase.from("orders").insert({
        nama: nama.trim(), phone: phone.trim(), alamat: alamat.trim() || null,
        items, catatan: catatan.trim() || null, subtotal, ongkir, total, status: "pending",
        location_url: locationUrl || null,
      });
      if (err) throw err;

      const settings = await getPublicSettings();
      const templates = await getWATemplates();
      const storeName = settings.store_name || "Sabana FC";
      const itemsList = cart.map((c) => `${c.nama} x${c.qty}`).join(", ");
      const locationLine = locationUrl ? `\n📍 Lokasi: ${locationUrl}` : "";

      if (templates.new_order?.enabled) {
        const ownerMsg = fillTemplate(templates.new_order.template, {
          store_name: storeName,
          nama: nama.trim(),
          phone: phone.trim(),
          items: itemsList,
          subtotal: subtotal.toLocaleString("id-ID"),
          ongkir: ongkir > 0 ? formatRupiah(ongkir) : "-",
          total: total.toLocaleString("id-ID"),
          location: locationLine,
          patokan: catatan.trim() || "-",
        });
        await sendWhatsApp(ownerMsg);
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim pesanan");
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen th-bg flex items-center justify-center p-4">
        <div className="th-card border th-border rounded-2xl w-full max-w-sm p-8 text-center shadow-xl">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-success" />
          </div>
          <h1 className="text-xl font-bold th-text mb-2">Pesanan Terkirim!</h1>
          <p className="text-sm th-text-secondary mb-4">Pesanan Anda sudah diterima. Kasir akan menghubungi Anda via WhatsApp untuk konfirmasi.</p>
          {ongkir > 0 ? (
            <div className="space-y-1 mb-4">
              <p className="text-sm th-text">Subtotal: {formatRupiah(subtotal)}</p>
              <p className="text-sm th-text">Ongkir: {formatRupiah(ongkir)}</p>
              <p className="text-lg font-bold th-accent">Total: {formatRupiah(total)}</p>
            </div>
          ) : (
            <p className="text-lg font-bold th-accent mb-6">Total: {formatRupiah(total)}</p>
          )}
            <button onClick={() => { setSubmitted(false); setCart([]); setNama(""); setPhone(""); setAlamat(""); setCatatan(""); setLocationUrl(""); }} className="w-full py-3 th-accent-bg text-white rounded-xl font-bold touch-target">
            Pesan Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen th-bg">
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="text-center py-4">
          <h1 className="text-2xl font-bold th-text">Pesan Online</h1>
          <p className="text-sm th-text-secondary">Delivery / Take Away</p>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {kategoriList.filter((k) => k !== "Semua").map((k) => {
            const isCollapsed = collapsedKategori.has(k);
            return (
              <button key={k} onClick={() => {
                setCollapsedKategori((prev) => {
                  const next = new Set(prev);
                  if (next.has(k)) next.delete(k); else next.add(k);
                  return next;
                });
              }} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${isCollapsed ? "th-card border th-border th-muted" : "th-accent-bg text-white"}`}>
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />} {k}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {kategoriList.filter((k) => k !== "Semua").map((k) => {
            const items = filtered.filter((item) => item.kategori === k);
            if (items.length === 0) return null;
            const isCollapsed = collapsedKategori.has(k);
            return (
              <div key={k}>
                <button onClick={() => {
                  setCollapsedKategori((prev) => {
                    const next = new Set(prev);
                    if (next.has(k)) next.delete(k); else next.add(k);
                    return next;
                  });
                }} className="flex items-center gap-2 w-full text-left mb-2">
                  {isCollapsed ? <ChevronRight size={14} className="th-muted" /> : <ChevronDown size={14} className="th-muted" />}
                  <span className="text-xs font-bold th-muted uppercase">{k}</span>
                  <span className="text-[10px] th-muted">({items.length})</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-2">
                    {items.map((item) => {
                      const inCart = cart.find((c) => c.id === item.id);
                      return (
                        <div key={item.id} className="th-card border th-border rounded-xl p-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium th-text truncate">{item.nama}</p>
                            <p className="text-xs th-accent font-bold">{formatRupiah(item.harga)}</p>
                          </div>
                          {inCart ? (
                            <div className="flex items-center gap-2">
                              <button onClick={() => updateQty(item.id, inCart.qty - 1)} className="w-8 h-8 rounded-lg border th-border flex items-center justify-center th-muted touch-target"><Minus size={14} /></button>
                              <span className="text-sm font-bold th-text w-6 text-center">{inCart.qty}</span>
                              <button onClick={() => updateQty(item.id, inCart.qty + 1)} className="w-8 h-8 rounded-lg border th-border flex items-center justify-center th-muted touch-target"><Plus size={14} /></button>
                            </div>
                          ) : (
                            <button onClick={() => {
                              if (availableAddons.length > 0 && item.has_addons) {
                                setAddonModal(item);
                                setSelectedAddons([]);
                              } else {
                                addToCart(item);
                              }
                            }} className="px-3 py-1.5 th-accent-bg text-white rounded-lg text-xs font-semibold touch-target"><Plus size={14} className="inline" /></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {cart.length > 0 && (
          <div className="th-card border th-border rounded-2xl p-4 space-y-3">
            <h3 className="text-sm font-bold th-text">Pesanan Anda</h3>
            {cart.map((c) => (
              <div key={`${c.id}-${(c.addons || []).map((a) => a.id).sort().join(",")}`} className="space-y-0.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="th-text">{c.nama} × {c.qty}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold th-accent">{formatRupiah(getItemPrice(c))}</span>
                    <button onClick={() => updateQty(`${c.id}-${(c.addons || []).map((a) => a.id).sort().join(",")}`, 0)} className="th-muted hover:text-danger"><Trash2 size={14} /></button>
                  </div>
                </div>
                {(c.addons || []).length > 0 && (
                  <p className="text-[10px] th-muted pl-2">+ {c.addons!.map((a) => a.nama).join(", ")}</p>
                )}
              </div>
            ))}
            <div className="border-t th-border pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="th-text-secondary">Subtotal</span>
                <span className="font-medium th-text">{formatRupiah(subtotal)}</span>
              </div>
              {ongkir > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="th-text-secondary">Ongkir</span>
                  <span className="font-medium th-text">{formatRupiah(ongkir)}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t th-border/50">
                <span className="font-bold th-text">Total</span>
                <span className="font-bold th-accent text-lg">{formatRupiah(total)}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="th-card border th-border rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold th-text">Data Pengiriman</h3>
          <div>
            <label className="text-xs font-semibold th-muted uppercase mb-1 block">Nama *</label>
            <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} required className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Nama Anda" />
          </div>
          <div>
            <label className="text-xs font-semibold th-muted uppercase mb-1 block">No. WhatsApp *</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="08xxxxxxxxxx" />
          </div>
          <div>
            <label className="text-xs font-semibold th-muted uppercase mb-1 block">Alamat *</label>
            <textarea value={alamat} onChange={(e) => setAlamat(e.target.value)} rows={2} required className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent resize-none" placeholder="Alamat pengiriman" />
            <button type="button" onClick={handleGetLocation} disabled={locating} className="mt-2 flex items-center gap-2 px-3 py-2 w-full th-card border th-border rounded-xl text-sm th-text hover:border-accent transition-colors touch-target">
              <MapPin size={16} className={locationUrl ? "text-success" : "th-muted"} />
              {locating ? "Mengambil lokasi..." : locationUrl ? "✓ Lokasi tersimpan" : "📍 Ambil Lokasi Saya"}
            </button>
            {locationUrl && (
              <a href={locationUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs text-blue-500 underline">Buka di Google Maps</a>
            )}
          </div>
          <div>
            <label className="text-xs font-semibold th-muted uppercase mb-1 block">Patokan</label>
            <input type="text" value={catatan} onChange={(e) => setCatatan(e.target.value)} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="Contoh: Depan warung soto, sebelah Indomaret" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button type="submit" disabled={loading || cart.length === 0} className="w-full py-3.5 th-accent-bg text-white rounded-xl font-bold text-base hover:opacity-90 disabled:opacity-50 touch-target flex items-center justify-center gap-2">
            <Send size={18} /> {loading ? "Mengirim..." : `Kirim Pesanan (${formatRupiah(total)})`}
          </button>
        </form>

        {addonModal && (
          <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4">
            <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl">
              <div className="flex items-center justify-between p-5 border-b th-border">
                <div>
                  <h2 className="text-lg font-bold th-text">{addonModal.nama}</h2>
                  <p className="text-xs th-accent font-bold">{formatRupiah(addonModal.harga)}</p>
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
                      }} className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border text-sm transition-colors ${isSelected ? "border-accent bg-red-50 dark:bg-red-950/20" : "th-border hover:border-accent"}`}>
                        <span className={isSelected ? "font-semibold th-text" : "th-text-secondary"}>{a.nama}</span>
                        <span className={isSelected ? "font-semibold th-accent" : "th-muted"}>+{formatRupiah(a.harga)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => { addToCart(addonModal); setAddonModal(null); setSelectedAddons([]); }} className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Tanpa Addon</button>
                  <button onClick={() => {
                    const addons = availableAddons.filter((a) => selectedAddons.includes(a.id));
                    addToCart(addonModal, addons);
                    setAddonModal(null);
                    setSelectedAddons([]);
                  }} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold touch-target">
                    Tambah{selectedAddons.length > 0 ? ` (+${formatRupiah(availableAddons.filter((a) => selectedAddons.includes(a.id)).reduce((s, a) => s + a.harga, 0))})` : ""}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
