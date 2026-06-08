"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { sendWhatsApp, sendWhatsAppImage, getSettings, getWATemplates, fillTemplate } from "@/lib/whatsapp";
import { convertQRIS } from "@/lib/qris";
import { Order } from "@/lib/types";
import { RefreshCw, CheckCircle, XCircle, Truck, Phone, AlertTriangle } from "lucide-react";

export default function OnlineOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [newOrderPopup, setNewOrderPopup] = useState<Order | null>(null);
  const [prevOrderIds, setPrevOrderIds] = useState<Set<string>>(new Set());
  const [itemChecks, setItemChecks] = useState<Record<string, boolean[]>>({});

  const initItemChecks = useCallback((order: Order) => {
    if (!itemChecks[order.id]) {
      setItemChecks((prev) => ({ ...prev, [order.id]: order.items.map(() => true) }));
    }
  }, [itemChecks]);

  const toggleItem = (orderId: string, idx: number) => {
    setItemChecks((prev) => {
      const checks = [...(prev[orderId] || [])];
      checks[idx] = !checks[idx];
      return { ...prev, [orderId]: checks };
    });
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) {
      const newOrders = data as Order[];
      if (prevOrderIds.size > 0) {
        const newPending = newOrders.filter((o) => o.status === "pending" && !prevOrderIds.has(o.id));
        if (newPending.length > 0) {
          setNewOrderPopup(newPending[0]);
        }
      }
      setPrevOrderIds(new Set(newOrders.map((o) => o.id)));
      setOrders(newOrders);
    }
    setLoading(false);
  }, [prevOrderIds]);

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleConfirmAndPay = async (order: Order) => {
    const settings = await getSettings();
    const templates = await getWATemplates();
    const staticQris = settings.qris_string;
    const storeName = settings.store_name || "Sabana FC";

    if (!staticQris) {
      alert("QRIS belum dikonfigurasi di Pengaturan");
      return;
    }

    const checks = itemChecks[order.id] || order.items.map(() => true);
    const availableItems = order.items.filter((_, i) => checks[i]);
    const unavailableItems = order.items.filter((_, i) => !checks[i]);
    const adjustedTotal = availableItems.reduce((s, item) => s + item.subtotal, 0);
    const availableIndices = checks.map((c, i) => c ? i : -1).filter((i) => i >= 0);

    await supabase.from("orders").update({
      status: "confirmed",
      total: adjustedTotal,
      available_items: availableIndices,
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);

    const dynamicQris = convertQRIS(staticQris, { amount: adjustedTotal });
    await supabase.from("orders").update({ qris_string: dynamicQris }).eq("id", order.id);

    const availableText = availableItems.map((i) => `✅ ${i.nama} x${i.qty} — ${formatRupiah(i.subtotal)}`).join("\n");
    const unavailableText = unavailableItems.length > 0 ? "\n" + unavailableItems.map((i) => `❌ ${i.nama} — habis`).join("\n") : "";
    const ongkirVal = order.ongkir || 0;

    if (templates.confirm?.enabled) {
      const msg = fillTemplate(templates.confirm.template, {
        store_name: storeName,
        nama: order.nama,
        items: order.items.map((i) => `${i.nama} x${i.qty}`).join(", "),
        ongkir: ongkirVal > 0 ? formatRupiah(ongkirVal) : "-",
        total: adjustedTotal.toLocaleString("id-ID"),
        available_items: availableText,
        unavailable_items: unavailableText,
      });
      await sendWhatsApp(msg, order.phone);
    }

    let qrSent = false;
    try {
      const QRCodeLib = await import("qrcode");
      const qrDataUrl = await QRCodeLib.default.toDataURL(dynamicQris, { width: 400, margin: 2, color: { dark: "#000000", light: "#FFFFFF" } });
      const imgResult = await sendWhatsAppImage(qrDataUrl, order.phone, `QRIS Pembayaran ${storeName} — Rp ${adjustedTotal.toLocaleString("id-ID")}`);
      qrSent = imgResult.success;
      if (!imgResult.success) {
        console.error("QR image send failed:", imgResult.error);
      }
    } catch (qrErr) {
      console.error("Failed to generate/send QR image:", qrErr);
    }

    if (!qrSent) {
      const confirmUrl = `${window.location.origin}/api/orders/confirm/${order.confirm_token}`;
      await sendWhatsApp(`Link pembayaran QRIS:\n${confirmUrl}`, order.phone);
    }

    fetchOrders();
  };

  const handleReject = async () => {
    if (!rejectingOrder) return;
    const templates = await getWATemplates();
    const storeName = (await getSettings()).store_name || "Sabana FC";

    await supabase.from("orders").update({ status: "unavailable", updated_at: new Date().toISOString() }).eq("id", rejectingOrder.id);

    if (templates.reject?.enabled) {
      const msg = fillTemplate(templates.reject.template, {
        store_name: storeName,
        catatan: rejectNote.trim() ? `\n\nCatatan: ${rejectNote.trim()}` : "",
      });
      await sendWhatsApp(msg, rejectingOrder.phone);
    }

    setRejectingOrder(null);
    setRejectNote("");
    fetchOrders();
  };

  const handleDone = async (order: Order) => {
    const templates = await getWATemplates();
    const storeName = (await getSettings()).store_name || "Sabana FC";

    await supabase.from("orders").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", order.id);

    if (templates.done?.enabled) {
      const msg = fillTemplate(templates.done.template, { store_name: storeName });
      await sendWhatsApp(msg, order.phone);
    }

    fetchOrders();
  };

  const handleCancel = async (order: Order) => {
    if (!confirm("Yakin batalkan pesanan ini?")) return;
    const templates = await getWATemplates();
    const storeName = (await getSettings()).store_name || "Sabana FC";

    await supabase.from("orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", order.id);

    if (templates.cancel?.enabled) {
      const msg = fillTemplate(templates.cancel.template, { store_name: storeName });
      await sendWhatsApp(msg, order.phone);
    }

    fetchOrders();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pending: { label: "Baru", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
      confirmed: { label: "Dikonfirmasi", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" },
      paid: { label: "Dibayar", color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" },
      done: { label: "Selesai", color: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700" },
      cancelled: { label: "Batal", color: "bg-red-50 text-red-500 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" },
      unavailable: { label: "Tidak Tersedia", color: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700" },
    };
    const s = map[status] || map.pending;
    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>;
  };

  const activeOrders = orders.filter((o) => o.status !== "done" && o.status !== "cancelled" && o.status !== "unavailable");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold th-text">Pesanan Online</h3>
        <button onClick={fetchOrders} className="p-1.5 th-muted hover:th-text"><RefreshCw size={14} /></button>
      </div>

      {loading && <p className="text-xs th-muted">Memuat...</p>}

      {activeOrders.length === 0 && !loading && (
        <p className="text-xs th-muted py-4 text-center">Belum ada pesanan online</p>
      )}

      {activeOrders.map((order) => {
        initItemChecks(order);
        return (
        <div key={order.id} className="th-card border th-border rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {statusBadge(order.status)}
              <span className="text-[10px] th-muted">{new Date(order.created_at).toLocaleString("id-ID")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Phone size={12} className="th-muted" />
            <span className="text-xs font-medium th-text">{order.nama}</span>
            <span className="text-xs th-muted">({order.phone})</span>
          </div>

          {order.alamat && <p className="text-xs th-muted">📍 {order.alamat}</p>}
          {order.location_url && (
            <a href={order.location_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
              📍 Buka di Maps
            </a>
          )}

          <div className="space-y-0.5">
            {order.items.map((item, i) => {
              const checks = itemChecks[order.id] || order.items.map(() => true);
              const isChecked = checks[i] !== false;
              const isPending = order.status === "pending";
              return (
                <div key={i} className={`flex items-center justify-between text-xs ${isPending && !isChecked ? "opacity-50 line-through" : ""}`}>
                  <div className="flex items-center gap-2">
                    {isPending && (
                      <input type="checkbox" checked={isChecked} onChange={() => toggleItem(order.id, i)} className="w-4 h-4 rounded accent-green-500 cursor-pointer" />
                    )}
                    <span className="th-text-secondary">{item.nama} × {item.qty}</span>
                  </div>
                  <span className={isChecked ? "th-text" : "text-danger"}>{isChecked ? formatRupiah(item.subtotal) : "habis"}</span>
                </div>
              );
            })}
          </div>

          {order.catatan && <p className="text-xs th-muted italic">📍 {order.catatan}</p>}

          <div className="flex justify-between items-center border-t th-border pt-2">
            <div>
              {order.status === "pending" ? (() => {
                const checks = itemChecks[order.id] || order.items.map(() => true);
                const adjustedTotal = order.items.filter((_, i) => checks[i]).reduce((s, item) => s + item.subtotal, 0);
                const hasUnchecked = checks.some((c) => !c);
                return (
                  <div>
                    <span className="text-sm font-bold th-accent">{formatRupiah(adjustedTotal)}</span>
                    {hasUnchecked && <span className="text-[10px] th-muted ml-2 line-through">{formatRupiah(order.total)}</span>}
                  </div>
                );
              })() : (
                <span className="text-sm font-bold th-accent">{formatRupiah(order.total)}</span>
              )}
            </div>
            <div className="flex gap-1.5">
              {order.status === "pending" && (
                <>
                  <button onClick={() => handleConfirmAndPay(order)} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 dark:bg-green-950/30 text-success rounded-lg text-xs font-medium border border-green-200 dark:border-green-800">
                    <CheckCircle size={12} /> Konfirmasi & Kirim QRIS
                  </button>
                  <button onClick={() => setRejectingOrder(order)} className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/30 text-danger rounded-lg text-xs font-medium border border-red-200 dark:border-red-800">
                    <AlertTriangle size={12} /> Tidak Tersedia
                  </button>
                </>
              )}
              {order.status === "confirmed" && (
                <button onClick={() => handleConfirmAndPay(order)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800">
                  <Truck size={12} /> Kirim QRIS Ulang
                </button>
              )}
              {order.status === "paid" && (
                <button onClick={() => handleDone(order)} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 dark:bg-green-950/30 text-success rounded-lg text-xs font-medium border border-green-200 dark:border-green-800">
                  <CheckCircle size={12} /> Selesai
                </button>
              )}
              {(order.status === "pending" || order.status === "confirmed") && (
                <button onClick={() => handleCancel(order)} className="p-1.5 th-muted hover:text-danger"><XCircle size={14} /></button>
              )}
            </div>
          </div>
        </div>
        );
      })}

      {newOrderPopup && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4">
          <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl border-amber-300 dark:border-amber-700">
            <div className="p-5 border-b th-border bg-amber-50 dark:bg-amber-950/20">
              <h2 className="text-lg font-bold th-text">🔔 Pesanan Baru!</h2>
              <p className="text-xs th-muted mt-1">{newOrderPopup.nama} ({newOrderPopup.phone})</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1">
                {newOrderPopup.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="th-text">{item.nama} × {item.qty}</span>
                    <span className="font-semibold th-accent">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t th-border pt-2 flex justify-between">
                <span className="font-bold th-text">Total</span>
                <span className="font-bold th-accent text-lg">{formatRupiah(newOrderPopup.total)}</span>
              </div>
              <button onClick={() => setNewOrderPopup(null)} className="w-full py-3 th-accent-bg text-white rounded-xl font-bold touch-target">
                Lihat Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectingOrder && (
        <div className="fixed inset-0 th-overlay flex items-center justify-center z-50 p-4">
          <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-5 border-b th-border">
              <h2 className="text-lg font-bold th-text">Tolak Pesanan</h2>
              <p className="text-xs th-muted mt-1">{rejectingOrder.nama} — {formatRupiah(rejectingOrder.total)}</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Catatan (opsional)</label>
                <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent resize-none" placeholder="Contoh: Ayam habis, mau diganti paha?" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setRejectingOrder(null); setRejectNote(""); }} className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
                <button onClick={handleReject} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:opacity-90 touch-target">Tolak Pesanan</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
