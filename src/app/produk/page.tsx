"use client";

import { useState } from "react";
import { useProduk } from "@/hooks/useProduk";
import { useStok } from "@/hooks/useStok";
import ProdukGrid from "@/components/produk/ProdukGrid";
import ProdukForm from "@/components/produk/ProdukForm";
import BulkInputModal, { Column } from "@/components/BulkInputModal";
import { Produk, KATEGORI_PRODUK } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Layers } from "lucide-react";

export default function ProdukPage() {
  const { produk, resepMap, loading, tambahProduk, editProduk, toggleAktif, hapusProduk, uploadGambar, refresh } = useProduk();
  const { bahanBaku } = useStok();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Produk | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");

  const kategoriList = ["Semua", ...Array.from(new Set(produk.map((p) => p.kategori)))];

  const PRODUK_COLUMNS: Column[] = [
    { key: "nama", label: "Nama Produk", type: "text", required: true, placeholder: "Geprek Dada" },
    { key: "kategori", label: "Kategori", type: "select", options: [...KATEGORI_PRODUK], required: true, defaultValue: "Ayam" },
    { key: "harga", label: "Harga (Rp)", type: "number", required: true, placeholder: "15000" },
  ];

  const handleBulkProduk = async (rows: Record<string, string>[]) => {
    let saved = 0;
    let errors = 0;
    for (const r of rows) {
      const { error } = await supabase.from("produk").insert({
        nama: r.nama,
        kategori: r.kategori || "Lainnya",
        harga: parseInt(r.harga) || 0,
        aktif: true,
      });
      if (error) errors++;
      else saved++;
    }
    if (saved > 0) refresh();
    return { saved, errors };
  };

  const filtered = produk.filter((p) => {
    const matchSearch = p.nama.toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori === "Semua" || p.kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="th-muted">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold th-text">Produk / Menu</h1>
          <p className="text-sm th-text-secondary mt-1">Kelola daftar menu dan resep</p>
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
            Tambah Produk
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 th-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {kategoriList.map((k) => (
            <button
              key={k}
              onClick={() => setFilterKategori(k)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors touch-target ${
                filterKategori === k
                  ? "th-accent-bg text-white"
                  : "bg-surface th-muted hover:th-text border border-border"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <ProdukGrid
        produk={filtered}
        resepMap={resepMap}
        bahanBaku={bahanBaku}
        onEdit={(p) => {
          setEditing(p);
          setShowForm(true);
        }}
        onToggle={toggleAktif}
        onDelete={hapusProduk}
      />

      {showForm && (
        <ProdukForm
          initial={editing}
          resepInitial={editing ? resepMap[editing.id] || [] : []}
          bahanBaku={bahanBaku}
          onUploadGambar={uploadGambar}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={async (data, resep) => {
            if (editing) {
              await editProduk(editing.id, data, resep);
            } else {
              await tambahProduk(data, resep);
            }
            setShowForm(false);
            setEditing(null);
          }}
        />
      )}
      {showBulk && (
        <BulkInputModal
          title="Bulk Input Produk"
          columns={PRODUK_COLUMNS}
          onClose={() => setShowBulk(false)}
          onSave={handleBulkProduk}
        />
      )}
    </div>
  );
}
