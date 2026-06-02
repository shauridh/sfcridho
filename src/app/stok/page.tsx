"use client";

import { useState } from "react";
import { useStok } from "@/hooks/useStok";
import StokTable from "@/components/stok/StokTable";
import StokForm from "@/components/stok/StokForm";
import RestockModal from "@/components/stok/RestockModal";
import OpnameModal from "@/components/stok/OpnameModal";
import ForecastBanner from "@/components/stok/ForecastBanner";
import { BahanBaku } from "@/lib/types";
import { Plus } from "lucide-react";

export default function StokPage() {
  const { bahanBaku, forecast, loading, tambahBahan, editBahan, hapusBahan, restock, opname } = useStok();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BahanBaku | null>(null);
  const [restocking, setRestocking] = useState<BahanBaku | null>(null);
  const [opnaming, setOpnaming] = useState<BahanBaku | null>(null);

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
    </div>
  );
}
