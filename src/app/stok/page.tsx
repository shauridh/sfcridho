"use client";

import { useState, useEffect } from "react";
import { useStok } from "@/hooks/useStok";
import { useKategori } from "@/hooks/useKategori";
import StokTable from "@/components/stok/StokTable";
import StokForm from "@/components/stok/StokForm";
import RestockModal from "@/components/stok/RestockModal";
import OpnameModal from "@/components/stok/OpnameModal";
import ForecastBanner from "@/components/stok/ForecastBanner";
import KategoriManager from "@/components/KategoriManager";
import BulkInputModal, { Column } from "@/components/BulkInputModal";
import { BahanBaku, SATUAN_OPTIONS } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { formatRupiah } from "@/lib/utils";
import { Plus, Layers, Tag, Flame, CalendarClock, Sparkles, ChevronDown, ChevronRight } from "lucide-react";

export default function StokPage() {
  const { bahanBaku, forecast, loading, tambahBahan, editBahan, hapusBahan, restock, opname, gorengHarian, getWeeklyForecast, applyReorderPoints, refresh } = useStok();
  const { namaList: kategoriOptions, kategoriList, tambahKategori, editKategori, hapusKategori } = useKategori("stok");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BahanBaku | null>(null);
  const [restocking, setRestocking] = useState<BahanBaku | null>(null);
  const [opnaming, setOpnaming] = useState<BahanBaku | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [showKategori, setShowKategori] = useState(false);
  const [gorengBatch, setGorengBatch] = useState("");
  const [gorengLoading, setGorengLoading] = useState(false);
  const [gorengError, setGorengError] = useState("");
  const [safetyDays, setSafetyDays] = useState(3);
  const [showWeekly, setShowWeekly] = useState(false);
  const [showReorder, setShowReorder] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);

  const allSatuan = [...SATUAN_OPTIONS.berat, ...SATUAN_OPTIONS.volume, ...SATUAN_OPTIONS.kemasan, ...SATUAN_OPTIONS.satuan];

  useEffect(() => {
    supabase.from("settings").select("value").eq("key", "safety_days").single().then(({ data }) => {
      if (data?.value) setSafetyDays(parseInt(data.value) || 3);
    });
  }, []);

  const STOK_COLUMNS: Column[] = [
    { key: "nama", label: "Nama Bahan", type: "text", required: true, placeholder: "Ayam Kampung" },
    { key: "kategori", label: "Kategori", type: "select", options: kategoriOptions.length > 0 ? kategoriOptions : ["Lainnya"], required: true, defaultValue: kategoriOptions[0] || "Lainnya" },
    { key: "sat_beli", label: "Sat Beli", type: "select", options: allSatuan, required: true, defaultValue: "kg" },
    { key: "isi_per_pak", label: "Isi/Pak", type: "number", required: true, placeholder: "9" },
    { key: "sat_dasar", label: "Sat Dasar", type: "select", options: allSatuan, required: true, defaultValue: "potong" },
    { key: "stok", label: "Stok Awal", type: "number", required: true, placeholder: "0", defaultValue: "0" },
    { key: "reorder_point", label: "Reorder Point", type: "number", placeholder: "18", defaultValue: "0" },
    { key: "harga_beli", label: "Harga Beli", type: "number", required: true, placeholder: "55000" },
    { key: "avg_daily", label: "Avg/Hari", type: "number", placeholder: "0", defaultValue: "0" },
  ];

  const handleBulkStok = async (rows: Record<string, string>[]) => {
    let saved = 0;
    let errors = 0;
    for (const r of rows) {
      const { error } = await supabase.from("bahan_baku").insert({
        nama: r.nama, kategori: r.kategori || "Lainnya",
        sat_beli: r.sat_beli || "pcs", isi_per_pak: parseFloat(r.isi_per_pak) || 1,
        sat_dasar: r.sat_dasar || "pcs", stok: parseFloat(r.stok) || 0,
        reorder_point: parseFloat(r.reorder_point) || 0, harga_beli: parseInt(r.harga_beli) || 0,
        avg_daily: parseFloat(r.avg_daily) || 0,
      });
      if (error) errors++; else saved++;
    }
    if (saved > 0) refresh();
    return { saved, errors };
  };

  const handleGorengHarian = async () => {
    const batch = parseInt(gorengBatch) || 0;
    if (batch <= 0) return;
    setGorengLoading(true);
    setGorengError("");
    const result = await gorengHarian(batch);
    if (result.error) {
      setGorengError(result.error.message);
    } else {
      setGorengBatch("");
    }
    setGorengLoading(false);
  };

  const handleApplyReorder = async () => {
    setReorderLoading(true);
    await applyReorderPoints(safetyDays);
    setReorderLoading(false);
    setShowReorder(false);
  };

  const batch = parseInt(gorengBatch) || 0;
  const ayam = bahanBaku.find((b) => b.kategori.toLowerCase() === "ayam");
  const tepung = bahanBaku.find((b) => b.nama.toLowerCase().includes("tepung"));
  const minyak = bahanBaku.find((b) => b.nama.toLowerCase().includes("minyak"));
  const weeklyForecast = getWeeklyForecast(safetyDays);
  const totalEstHarga = weeklyForecast.reduce((s, f) => s + f.estHarga, 0);
  const urgentItems = weeklyForecast.filter((f) => f.isUrgent);
  const today = new Date();

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="th-muted">Memuat data...</div></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <ForecastBanner forecast={forecast} />

      {/* Reorder Point Rekomendasi */}
      {urgentItems.length > 0 && (
        <div className="th-card border th-border rounded-2xl p-4 md:p-5 shadow-sm border-amber-300 dark:border-amber-700">
          <button onClick={() => setShowReorder(!showReorder)} className="flex items-center gap-2 w-full text-left">
            <Sparkles size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold th-text flex-1">Rekomendasi Reorder Point</h2>
            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-semibold">{urgentItems.length} perlu</span>
            {showReorder ? <ChevronDown size={16} className="th-muted" /> : <ChevronRight size={16} className="th-muted" />}
          </button>
          {showReorder && (
            <div className="mt-3 space-y-2">
              {weeklyForecast.filter((f) => f.recommendedReorderPoint > 0).map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm">
                  <span className="th-text-secondary">{f.nama}</span>
                  <span className={f.isUrgent ? "font-semibold text-amber-600" : "font-medium th-text"}>
                    {f.recommendedReorderPointBeli} {f.sat_beli} ({f.recommendedReorderPoint} {f.sat_dasar})
                  </span>
                </div>
              ))}
              <button onClick={handleApplyReorder} disabled={reorderLoading} className="w-full mt-2 py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 touch-target">
                {reorderLoading ? "Menerapkan..." : "Terapkan Semua Rekomendasi"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Estimasi Order Mingguan */}
      {weeklyForecast.length > 0 && (
        <div className="th-card border th-border rounded-2xl p-4 md:p-5 shadow-sm">
          <button onClick={() => setShowWeekly(!showWeekly)} className="flex items-center gap-2 w-full text-left">
            <CalendarClock size={18} className="th-accent" />
            <h2 className="text-sm font-bold th-text flex-1">Estimasi Order Mingguan</h2>
            {totalEstHarga > 0 && <span className="text-xs th-accent font-semibold">{formatRupiah(totalEstHarga)}</span>}
            {showWeekly ? <ChevronDown size={16} className="th-muted" /> : <ChevronRight size={16} className="th-muted" />}
          </button>
          {showWeekly && (
            <div className="mt-3 overflow-x-auto">
              <p className="text-[10px] th-muted mb-2">📅 {today.toLocaleDateString("id-ID", { day: "numeric", month: "long" })} — {new Date(today.getTime() + 7 * 86400000).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · Safety: {safetyDays} hari</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b th-border">
                    <th className="py-2 text-left font-semibold th-muted uppercase">Bahan</th>
                    <th className="py-2 text-right font-semibold th-muted uppercase">Stok</th>
                    <th className="py-2 text-right font-semibold th-muted uppercase">/Hari</th>
                    <th className="py-2 text-right font-semibold th-muted uppercase">Sisa</th>
                    <th className="py-2 text-right font-semibold th-muted uppercase">Order By</th>
                    <th className="py-2 text-right font-semibold th-muted uppercase">Jumlah</th>
                    <th className="py-2 text-right font-semibold th-muted uppercase">Est. Harga</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyForecast.map((f) => (
                    <tr key={f.id} className={`border-b th-border/30 ${f.isUrgent ? "bg-red-50 dark:bg-red-950/20" : ""}`}>
                      <td className="py-2 font-medium th-text">{f.nama}</td>
                      <td className="py-2 text-right th-text-secondary">{f.stokBeli} {f.sat_beli}</td>
                      <td className="py-2 text-right th-text-secondary">{f.avgDailyBeli.toFixed(1)}</td>
                      <td className={`py-2 text-right font-semibold ${f.daysRemaining <= 3 ? "text-danger" : f.daysRemaining <= 7 ? "text-warning" : "text-success"}`}>
                        {f.daysRemaining}h
                      </td>
                      <td className={`py-2 text-right font-semibold ${f.isUrgent ? "text-danger" : "th-text"}`}>
                        {f.isUrgent ? "⚠️ SEKARANG" : f.orderByDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      </td>
                      <td className="py-2 text-right font-semibold th-text">{f.reorderQtyBeli} {f.sat_beli}</td>
                      <td className="py-2 text-right font-semibold th-accent">{f.estHarga > 0 ? formatRupiah(f.estHarga) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 th-border">
                    <td colSpan={5} className="py-2 font-bold th-text">Total Estimasi</td>
                    <td colSpan={2} className="py-2 text-right font-bold th-accent text-sm">{formatRupiah(totalEstHarga)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Goreng Hari Ini */}
      <div className="th-card border th-border rounded-2xl p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Flame size={18} className="text-orange-500" />
          <h2 className="text-sm font-bold th-text">Goreng Hari Ini</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Berapa kali goreng batch?</label>
            <input type="text" inputMode="numeric" value={gorengBatch} onChange={(e) => { setGorengBatch(e.target.value); setGorengError(""); }} className="w-full px-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" placeholder="0" />
          </div>
          <button onClick={handleGorengHarian} disabled={gorengLoading || batch <= 0} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 touch-target whitespace-nowrap">
            {gorengLoading ? "Memproses..." : "Proses Goreng"}
          </button>
        </div>

        {batch > 0 && (
          <div className="mt-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3 space-y-1 text-sm">
            <p className="text-[10px] font-semibold text-orange-700 dark:text-orange-400 uppercase mb-1">Akan terpotong otomatis:</p>
            {ayam && <div className="flex justify-between"><span className="th-text-secondary">🍗 {ayam.nama}</span><span className="font-semibold th-text">−{batch * 3} pak ({batch * 3 * ayam.isi_per_pak} {ayam.sat_dasar})</span></div>}
            {tepung && <div className="flex justify-between"><span className="th-text-secondary">📦 {tepung.nama}</span><span className="font-semibold th-text">−{batch} kg</span></div>}
            {minyak && <div className="flex justify-between"><span className="th-text-secondary">🛢️ {minyak.nama}</span><span className="font-semibold th-text">−2 liter</span></div>}
            {!ayam && <p className="text-xs text-danger">⚠️ Bahan kategori &quot;Ayam&quot; belum ada</p>}
          </div>
        )}
        {gorengError && <p className="text-xs text-danger mt-2">{gorengError}</p>}
      </div>

      {/* Bahan Baku */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold th-text">Bahan Baku</h1>
          <p className="text-xs md:text-sm th-text-secondary mt-1">Pantau stok, forecast, dan kelola bahan baku</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowKategori(!showKategori)} className="flex items-center gap-2 px-3 py-2.5 border th-border rounded-xl font-semibold text-sm th-muted hover:th-text transition-colors touch-target">
            <Tag size={16} /> Kategori
          </button>
          <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-3 py-2.5 border th-border rounded-xl font-semibold text-sm th-muted hover:th-text transition-colors touch-target">
            <Layers size={16} /> Bulk
          </button>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors touch-target">
            <Plus size={18} /> Tambah
          </button>
        </div>
      </div>

      {showKategori && (
        <KategoriManager title="Kategori Bahan Baku" kategoriList={kategoriList} onAdd={tambahKategori} onEdit={editKategori} onDelete={hapusKategori} />
      )}

      <StokTable bahanBaku={bahanBaku} forecast={forecast} onEdit={(b) => { setEditing(b); setShowForm(true); }} onRestock={(b) => setRestocking(b)} onOpname={(b) => setOpnaming(b)} onDelete={hapusBahan} />

      {showForm && <StokForm initial={editing} kategoriOptions={kategoriOptions.length > 0 ? kategoriOptions : ["Lainnya"]} safetyDays={safetyDays} onClose={() => { setShowForm(false); setEditing(null); }} onSave={async (data) => { if (editing) await editBahan(editing.id, data); else await tambahBahan(data); setShowForm(false); setEditing(null); }} />}
      {restocking && <RestockModal bahan={restocking} onClose={() => setRestocking(null)} onRestock={async (jumlah) => { await restock(restocking.id, jumlah); setRestocking(null); }} />}
      {opnaming && <OpnameModal bahan={opnaming} onClose={() => setOpnaming(null)} onOpname={async (jumlahAktual) => { await opname(opnaming.id, jumlahAktual); setOpnaming(null); }} />}
      {showBulk && <BulkInputModal title="Bulk Input Bahan Baku" columns={STOK_COLUMNS} templateFile="/templates/template-stok.csv" onClose={() => setShowBulk(false)} onSave={handleBulkStok} />}
    </div>
  );
}
