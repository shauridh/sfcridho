"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { sendWhatsApp, getSettings } from "@/lib/whatsapp";
import { convertQRIS } from "@/lib/qris";
import { Order } from "@/lib/types";
import { RefreshCw, CheckCircle, Clock, XCircle, Truck, Phone } from "lucide-react";

export default function OnlineOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setOrders(data as Order[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleConfirm = async (order: Order) => {
    await supabase.from("orders").update({ status: "confirmed", updated_at: new Date().toISOString() }).eq("id", order.id);

    const settings = await getSettings();
    const storeName = settings.store_name || "Sabana FC";
    const items = order.items.map((i) => `${i.nama} x${i.qty}`).join(", ");
    const msg = `*${storeName}*\nPesanan Anda dikonfirmasi!\n\n${items}\nTotal: Rp ${order.total.toLocaleString("id-ID")}\n\nSilakan lakukan pembayaran. QRIS akan dikirim berikutnya.`;
    await sendWhatsApp(msg);

    fetchOrders();
  };

  const handleSendQRIS = async (order: Order) => {
    const settings = await getSettings();
    const staticQris = settings.qris_string;
    if (!staticQris) {
      alert("QRIS belum dikonfigurasi di Pengaturan");
      return;
    }

    const dynamicQris = convertQRIS(staticQris, { amount: order.total });
    await supabase.from("orders").update({ qris_string: dynamicQris, updated_at: new Date().toISOString() }).eq("id", order.id);

    const storeName = settings.store_name || "Sabana FC";
    const confirmUrl = `${window.location.origin}/api/orders/confirm/${order.confirm_token}`;
    const msg = `*${storeName}*\nSilakan scan QRIS berikut untuk pembayaran:\n\nTotal: Rp ${order.total.toLocaleString("id-ID")}\n\nSetelah bayar, klik link ini untuk konfirmasi:\n${confirmUrl}`;
    await sendWhatsApp(msg);

    alert("QRIS & link konfirmasi terkirim ke customer");
    fetchOrders();
  };

  const handleDone = async (order: Order) => {
    await supabase.from("orders").update({ status: "done", updated_at: new Date().toISOString() }).eq("id", order.id);
    fetchOrders();
  };

  const handleCancel = async (order: Order) => {
    if (!confirm("Yakin batalkan pesanan ini?")) return;
    await supabase.from("orders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", order.id);
    fetchOrders();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pending: { label: "Baru", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800" },
      confirmed: { label: "Dikonfirmasi", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" },
      paid: { label: "Dibayar", color: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" },
      done: { label: "Selesai", color: "bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700" },
      cancelled: { label: "Batal", color: "bg-red-50 text-red-500 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800" },
    };
    const s = map[status] || map.pending;
    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>;
  };

  const activeOrders = orders.filter((o) => o.status !== "done" && o.status !== "cancelled");

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

      {activeOrders.map((order) => (
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

          <div className="space-y-0.5">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="th-text-secondary">{item.nama} × {item.qty}</span>
                <span className="th-text">{formatRupiah(item.subtotal)}</span>
              </div>
            ))}
          </div>

          {order.catatan && <p className="text-xs th-muted italic">Catatan: {order.catatan}</p>}

          <div className="flex justify-between items-center border-t th-border pt-2">
            <span className="text-sm font-bold th-accent">{formatRupiah(order.total)}</span>
            <div className="flex gap-1.5">
              {order.status === "pending" && (
                <button onClick={() => handleConfirm(order)} className="flex items-center gap-1 px-2.5 py-1.5 bg-green-50 dark:bg-green-950/30 text-success rounded-lg text-xs font-medium border border-green-200 dark:border-green-800">
                  <CheckCircle size={12} /> Konfirmasi
                </button>
              )}
              {order.status === "confirmed" && (
                <button onClick={() => handleSendQRIS(order)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800">
                  <Truck size={12} /> Kirim QRIS
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
      ))}
    </div>
  );
}
