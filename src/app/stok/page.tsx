"use client";

import { useState } from "react";
import { useStok } from "@/hooks/useStok";
import { useKategori } from "@/hooks/useKategori";
import StokTable from "@/components/stok/StokTable";
import StokForm from "@/components/stok/StokForm";
import RestockModal from "@/components/stok/RestockModal";
import OpnameModal from "@/components/stok/OpnameModal";
import GorengModal from "@/components/stok/GorengModal";
import ForecastBanner from "@/components/stok/ForecastBanner";
import KategoriManager from "@/components/KategoriManager";
import BulkInputModal, { Column } from "@/components/BulkInputModal";
import { BahanBaku, SATUAN_OPTIONS } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Plus, Layers, Tag } from "lucide-react";

export default function StokPage() {
  const { bahanBaku, forecast, loading, tambahBahan, editBahan, hapusBahan, restock, opname, goreng, refresh } = useStok();
  const { namaList: kategoriOptions, kategoriList, tambahKategori, editKategori, hapusKategori } = useKategori("stok");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BahanBaku | null>(null);
  const [restocking, setRestocking] = useState<BahanBaku | null>(null);
  const [opnaming, setOpnaming] = useState<BahanBaku | null>(null);
  const [gorenging, setGorenging] = useState<BahanBaku | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [showKategori, setShowKategori] = useState(false);

  const allSatuan = [...SATUAN_OPTIONS.berat, ...SATUAN_OPTIONS.volume, ...SATUAN_OPTIONS.kemasan, ...SATUAN_OPTIONS.satuan];

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

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="th-muted">Memuat data...</div></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <ForecastBanner forecast={forecast} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold th-text">Bahan Baku</h1>
          <p className="text-sm th-text-secondary mt-1">Pantau stok, forecast, dan kelola bahan baku</p>
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

      <StokTable bahanBaku={bahanBaku} forecast={forecast} onEdit={(b) => { setEditing(b); setShowForm(true); }} onRestock={(b) => setRestocking(b)} onOpname={(b) => setOpnaming(b)} onGoreng={(b) => setGorenging(b)} onDelete={hapusBahan} />

      {showForm && <StokForm initial={editing} kategoriOptions={kategoriOptions.length > 0 ? kategoriOptions : ["Lainnya"]} onClose={() => { setShowForm(false); setEditing(null); }} onSave={async (data) => { if (editing) await editBahan(editing.id, data); else await tambahBahan(data); setShowForm(false); setEditing(null); }} />}
      {restocking && <RestockModal bahan={restocking} onClose={() => setRestocking(null)} onRestock={async (jumlah) => { await restock(restocking.id, jumlah); setRestocking(null); }} />}
      {opnaming && <OpnameModal bahan={opnaming} onClose={() => setOpnaming(null)} onOpname={async (jumlahAktual) => { await opname(opnaming.id, jumlahAktual); setOpnaming(null); }} />}
      {gorenging && <GorengModal bahan={gorenging} onClose={() => setGorenging(null)} onGoreng={async (jumlahKantong) => { await goreng(gorenging.id, jumlahKantong); setGorenging(null); }} />}
      {showBulk && <BulkInputModal title="Bulk Input Bahan Baku" columns={STOK_COLUMNS} templateFile="/templates/template-stok.csv" onClose={() => setShowBulk(false)} onSave={handleBulkStok} />}
    </div>
  );
}
