"use client";

import { useState } from "react";
import { Kategori } from "@/lib/types";
import { Plus, Edit3, Trash2, Check, X, Tag } from "lucide-react";

interface Props {
  title: string;
  kategoriList: Kategori[];
  onAdd: (nama: string) => Promise<{ error: any }>;
  onEdit: (id: string, nama: string) => Promise<{ error: any }>;
  onDelete: (id: string) => Promise<{ error: any }>;
}

export default function KategoriManager({ title, kategoriList, onAdd, onEdit, onDelete }: Props) {
  const [newNama, setNewNama] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newNama.trim()) return;
    await onAdd(newNama.trim());
    setNewNama("");
  };

  const handleEdit = async (id: string) => {
    if (!editNama.trim()) return;
    await onEdit(id, editNama.trim());
    setEditingId(null);
    setEditNama("");
  };

  return (
    <div className="th-card border th-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={14} className="th-accent" />
        <h3 className="text-sm font-bold th-text">{title}</h3>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newNama}
          onChange={(e) => setNewNama(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Nama kategori baru..."
          className="flex-1 px-3 py-2 th-card border th-border rounded-lg text-sm th-text focus:outline-none focus:border-accent"
        />
        <button onClick={handleAdd} disabled={!newNama.trim()} className="px-3 py-2 th-accent-bg text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 touch-target">
          <Plus size={16} />
        </button>
      </div>

      <div className="space-y-1">
        {kategoriList.map((k) => (
          <div key={k.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:th-surface transition-colors">
            {editingId === k.id ? (
              <>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEdit(k.id)}
                  autoFocus
                  className="flex-1 px-2 py-1 th-card border th-border rounded text-xs th-text focus:outline-none focus:border-accent"
                />
                <button onClick={() => handleEdit(k.id)} className="p-1 text-success"><Check size={14} /></button>
                <button onClick={() => { setEditingId(null); setEditNama(""); }} className="p-1 th-muted"><X size={14} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm th-text">{k.nama}</span>
                <button onClick={() => { setEditingId(k.id); setEditNama(k.nama); }} className="p-1 th-muted hover:th-accent"><Edit3 size={12} /></button>
                {confirmDelete === k.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={async () => { await onDelete(k.id); setConfirmDelete(null); }} className="px-1.5 py-0.5 bg-danger text-white rounded text-[10px]">Hapus</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-1.5 py-0.5 th-muted text-[10px]">Batal</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(k.id)} className="p-1 th-muted hover:text-danger"><Trash2 size={12} /></button>
                )}
              </>
            )}
          </div>
        ))}
        {kategoriList.length === 0 && <p className="text-xs th-muted py-2 text-center">Belum ada kategori</p>}
      </div>
    </div>
  );
}
