"use client";

import { useState } from "react";
import { useProduk } from "@/hooks/useProduk";
import { useStok } from "@/hooks/useStok";
import { useKategori } from "@/hooks/useKategori";
import ProdukGrid from "@/components/produk/ProdukGrid";
import ProdukForm from "@/components/produk/ProdukForm";
import KategoriManager from "@/components/KategoriManager";
import BulkInputModal, { Column } from "@/components/BulkInputModal";
import { Produk } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Plus, Search, Layers, Tag } from "lucide-react";

export default function ProdukPage() {
  const { produk, resepMap, loading, tambahProduk, editProduk, toggleAktif, hapusProduk, uploadGambar, refresh } = useProduk();
  const { bahanBaku } = useStok();
  const { namaList: kategoriOptions, kategoriList, tambahKategori, editKategori, hapusKategori } = useKategori("produk");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Produk | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [showKategori, setShowKategori] = useState(false);
  const [search, setSearch] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");

  const kategoriFilterList = ["Semua", ...Array.from(new Set(produk.map((p) => p.kategori)))];

  const PRODUK_COLUMNS: Column[] = [
    { key: "nama", label: "Nama Produk", type: "text", required: true, placeholder: "Geprek Dada" },
    { key: "kategori", label: "Kategori", type: "select", options: kategoriOptions.length > 0 ? kategoriOptions : ["Lainnya"], required: true, defaultValue: kategoriOptions[0] || "Lainnya" },
    { key: "harga", label: "Harga (Rp)", type: "number", required: true, placeholder: "15000" },
  ];

  const handleBulkProduk = async (rows: Record<string, string>[]) => {
    let saved = 0;
    let errors = 0;
    for (const r of rows) {
      const { error } = await supabase.from("produk").insert({ nama: r.nama, kategori: r.kategori || "Lainnya", harga: parseInt(r.harga) || 0, aktif: true });
      if (error) errors++; else saved++;
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
    return <div className="flex items-center justify-center h-full"><div className="th-muted">Memuat data...</div></div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold th-text">Produk / Menu</h1>
          <p className="text-xs md:text-sm th-text-secondary mt-1">Kelola daftar menu dan resep</p>
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
        <KategoriManager title="Kategori Produk" kategoriList={kategoriList} onAdd={tambahKategori} onEdit={editKategori} onDelete={hapusKategori} />
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 th-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..." className="w-full pl-9 pr-3 py-2.5 bg-surface border border-border rounded-xl text-sm th-text focus:outline-none focus:border-accent" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {kategoriFilterList.map((k) => (
            <button key={k} onClick={() => setFilterKategori(k)} className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors touch-target ${filterKategori === k ? "th-accent-bg text-white" : "bg-surface th-muted hover:th-text border border-border"}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <ProdukGrid produk={filtered} resepMap={resepMap} bahanBaku={bahanBaku} onEdit={(p) => { setEditing(p); setShowForm(true); }} onToggle={toggleAktif} onDelete={hapusProduk} />

      {showForm && <ProdukForm initial={editing} resepInitial={editing ? resepMap[editing.id] || [] : []} bahanBaku={bahanBaku} kategoriOptions={kategoriOptions.length > 0 ? kategoriOptions : ["Lainnya"]} onUploadGambar={uploadGambar} onClose={() => { setShowForm(false); setEditing(null); }} onSave={async (data, resep) => { if (editing) await editProduk(editing.id, data, resep); else await tambahProduk(data, resep); setShowForm(false); setEditing(null); }} />}
      {showBulk && <BulkInputModal title="Bulk Input Produk" columns={PRODUK_COLUMNS} templateFile="/templates/template-produk.csv" onClose={() => setShowBulk(false)} onSave={handleBulkProduk} />}
    </div>
  );
}
