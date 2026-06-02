"use client";

import { useState } from "react";
import { useStok } from "@/hooks/useStok";
import StokTable from "@/components/stok/StokTable";
import StokForm from "@/components/stok/StokForm";
import RestockModal from "@/components/stok/RestockModal";
import OpnameModal from "@/components/stok/OpnameModal";
import ForecastBanner from "@/components/stok/ForecastBanner";
import BulkInputModal, { Column } from "@/components/BulkInputModal";
import { BahanBaku, KATEGORI_BAHAN, SATUAN_OPTIONS } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Plus, Layers } from "lucide-react";

export default function StokPage() {
  const { bahanBaku, forecast, loading, tambahBahan, editBahan, hapusBahan, restock, opname, refresh } = useStok();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BahanBaku | null>(null);
  const [restocking, setRestocking] = useState<BahanBaku | null>(null);
  const [opnaming, setOpnaming] = useState<BahanBaku | null>(null);
  const [showBulk, setShowBulk] = useState(false);

  const allSatuan = [
    ...SATUAN_OPTIONS.berat,
    ...SATUAN_OPTIONS.volume,
    ...SATUAN_OPTIONS.kemasan,
    ...SATUAN_OPTIONS.satuan,
  ];

  const STOK_COLUMNS: Column[] = [
    { key: "nama", label: "Nama Bahan", type: "text", required: true, placeholder: "Ayam Kampung" },
    { key: "kategori", label: "Kategori", type: "select", options: [...KATEGORI_BAHAN], required: true, defaultValue: "Lainnya" },
    { key: "sat_beli", label: "Sat Beli", type: "select", options: allSatuan, required: true, defaultValue: "kg" },
    { key: "isi_per_pak", label: "Isi/Pak", type: "number", required: true, placeholder: "9" },
    { key: "sat_dasar", label: "Sat Dasar", type: "select", options: allSatuan, required: true, defaultValue: "potong" },
    { key: "stok", label: "Stok Awal", type: "number", required: true, placeholder: "0", defaultValue: "0" },
    { key: "reorder_point", label: "Reorder Point", type: "number", placeholder: "18", defaultValue: "0" },
    { key: "harga_beli", label: "Harga Beli", type: "number", required: true, placeholder: "55000" },
  ];

  const handleBulkStok = async (rows: Record<string, string>[]) => {
    let saved = 0;
    let errors = 0;
    for (const r of rows) {
      const { error } = await supabase.from("bahan_baku").insert({
        nama: r.nama,
        kategori: r.kategori || "Lainnya",
        sat_beli: r.sat_beli || "pcs",
        isi_per_pak: parseFloat(r.isi_per_pak) || 1,
        sat_dasar: r.sat_dasar || "pcs",
        stok: parseFloat(r.stok) || 0,
        reorder_point: parseFloat(r.reorder_point) || 0,
        harga_beli: parseInt(r.harga_beli) || 0,
      });
      if (error) errors++;
      else saved++;
    }
    if (saved > 0) refresh();
    return { saved, errors };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="th-muted">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <ForecastBanner forecast={forecast} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold th-text">Bahan Baku</h1>
          <p className="text-sm th-text-secondary mt-1">
            Pantau stok, forecast, dan kelola bahan baku outlet
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-2 px-4 py-2.5 border th-border rounded-xl font-semibold text-sm th-muted hover:th-text transition-colors touch-target"
          >
            <Layers size={18} />
            Bulk Input
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 th-accent-bg text-white rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors touch-target"
          >
            <Plus size={18} />
            Tambah Bahan
          </button>
        </div>
      </div>

      <StokTable
        bahanBaku={bahanBaku}
        forecast={forecast}
        onEdit={(b) => {
          setEditing(b);
          setShowForm(true);
        }}
        onRestock={(b) => setRestocking(b)}
        onOpname={(b) => setOpnaming(b)}
        onDelete={hapusBahan}
      />

      {showForm && (
        <StokForm
          initial={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={async (data) => {
            if (editing) {
              await editBahan(editing.id, data);
            } else {
              await tambahBahan(data);
            }
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}

      {restocking && (
        <RestockModal
          bahan={restocking}
          onClose={() => setRestocking(null)}
          onRestock={async (jumlah) => {
            await restock(restocking.id, jumlah);
            setRestocking(null);
          }}
        />
      )}

      {opnaming && (
        <OpnameModal
          bahan={opnaming}
          onClose={() => setOpnaming(null)}
          onOpname={async (jumlahAktual) => {
            await opname(opnaming.id, jumlahAktual);
            setOpnaming(null);
          }}
        />
      )}

      {showBulk && (
        <BulkInputModal
          title="Bulk Input Bahan Baku"
          columns={STOK_COLUMNS}
          onClose={() => setShowBulk(false)}
          onSave={handleBulkStok}
        />
      )}
    </div>
  );
}
