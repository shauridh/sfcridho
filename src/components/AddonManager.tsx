"use client";

import { useState } from "react";
import { Addon } from "@/lib/types";
import { formatRupiah } from "@/lib/utils";
import { Plus, Edit3, Trash2, Check, X, Puzzle } from "lucide-react";

interface Props {
  addons: Addon[];
  onAdd: (nama: string, harga: number) => Promise<{ error: any }>;
  onEdit: (id: string, data: { nama?: string; harga?: number }) => Promise<{ error: any }>;
  onDelete: (id: string) => Promise<{ error: any }>;
}

export default function AddonManager({ addons, onAdd, onEdit, onDelete }: Props) {
  const [newNama, setNewNama] = useState("");
  const [newHarga, setNewHarga] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editHarga, setEditHarga] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newNama.trim()) return;
    await onAdd(newNama.trim(), parseInt(newHarga) || 0);
    setNewNama("");
    setNewHarga("");
  };

  const handleEdit = async (id: string) => {
    if (!editNama.trim()) return;
    await onEdit(id, { nama: editNama.trim(), harga: parseInt(editHarga) || 0 });
    setEditingId(null);
    setEditNama("");
    setEditHarga("");
  };

  return (
    <div className="th-card border th-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Puzzle size={14} className="th-accent" />
        <h3 className="text-sm font-bold th-text">Addon / Varian</h3>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newNama}
          onChange={(e) => setNewNama(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nama addon (Nasi, Sambal...)"
          className="flex-1 px-3 py-2 th-card border th-border rounded-lg text-sm th-text focus:outline-none focus:border-accent"
        />
        <input
          type="number"
          value={newHarga}
          onChange={(e) => setNewHarga(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Harga"
          min="0"
          className="w-28 px-3 py-2 th-card border th-border rounded-lg text-sm th-text focus:outline-none focus:border-accent"
        />
        <button onClick={handleAdd} disabled={!newNama.trim()} className="px-3 py-2 th-accent-bg text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 touch-target">
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-1">
        {addons.map((a) => (
          <div key={a.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:th-surface transition-colors ${!a.aktif ? "opacity-50" : ""}`}>
            {editingId === a.id ? (
              <>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit(a.id)}
                  autoFocus
                  className="flex-1 px-2 py-1 th-card border th-border rounded text-xs th-text focus:outline-none focus:border-accent"
                />
                <input
                  type="number"
                  value={editHarga}
                  onChange={(e) => setEditHarga(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit(a.id)}
                  min="0"
                  className="w-24 px-2 py-1 th-card border th-border rounded text-xs th-text focus:outline-none focus:border-accent"
                />
                <button onClick={() => handleEdit(a.id)} className="p-1 text-success"><Check size={14} /></button>
                <button onClick={() => { setEditingId(null); setEditNama(""); setEditHarga(""); }} className="p-1 th-muted"><X size={14} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm th-text">{a.nama}</span>
                <span className="text-xs th-accent font-semibold">{formatRupiah(a.harga)}</span>
                <button onClick={() => { setEditingId(a.id); setEditNama(a.nama); setEditHarga(a.harga.toString()); }} className="p-1 th-muted hover:th-accent"><Edit3 size={12} /></button>
                {confirmDelete === a.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={async () => { await onDelete(a.id); setConfirmDelete(null); }} className="px-1.5 py-0.5 bg-danger text-white rounded text-[10px]">Hapus</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-1.5 py-0.5 th-muted text-[10px]">Batal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(a.id)} className="p-1 th-muted hover:text-danger"><Trash2 size={12} /></button>
                )}
              </>
            )}
          </div>
        ))}
        {addons.length === 0 && <p className="text-xs th-muted py-2 text-center">Belum ada addon</p>}
      </div>
    </div>
  );
}
