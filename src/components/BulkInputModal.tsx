"use client";

import { useState, useRef } from "react";
import { X, Plus, Trash2, ClipboardPaste, Upload, Download } from "lucide-react";

export interface Column {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}

interface Props {
  title: string;
  columns: Column[];
  templateFile?: string;
  onClose: () => void;
  onSave: (rows: Record<string, string>[]) => Promise<{ saved: number; errors: number }>;
}

export default function BulkInputModal({ title, columns, templateFile, onClose, onSave }: Props) {
  const [rows, setRows] = useState<Record<string, string>[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ saved: number; errors: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function emptyRow(): Record<string, string> {
    const r: Record<string, string> = {};
    columns.forEach((c) => { r[c.key] = c.defaultValue || ""; });
    return r;
  }

  const addRow = () => setRows([...rows, emptyRow()]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));
  const updateCell = (idx: number, key: string, val: string) => {
    const updated = [...rows];
    updated[idx] = { ...updated[idx], [key]: val };
    setRows(updated);
  };

  const handlePaste = () => {
    const text = textareaRef.current?.value || "";
    if (!text.trim()) return;
    const lines = text.trim().split("\n").filter((l) => l.trim());
    const parsed: Record<string, string>[] = lines.map((line) => {
      const cells = line.split("\t");
      const r: Record<string, string> = {};
      columns.forEach((c, i) => { r[c.key] = (cells[i] || "").trim(); });
      return r;
    });
    setRows(parsed);
  };

  const handleSave = async () => {
    const valid = rows.filter((r) => columns.filter((c) => c.required).every((c) => r[c.key]?.trim()));
    if (valid.length === 0) return;
    setSaving(true);
    const res = await onSave(valid);
    setResult(res);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-end sm:items-center justify-center z-50" >
      <div className="th-card border th-border rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b th-border shrink-0">
          <h2 className="text-lg font-bold th-text">{title}</h2>
          <button  className="p-2 th-muted hover:th-text"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="th-surface rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <ClipboardPaste size={14} className="th-muted" />
                <span className="text-xs font-semibold th-muted uppercase">Paste dari Excel / Google Sheets</span>
              </div>
              {templateFile && (
                <a href={templateFile} download className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 rounded-lg text-[10px] font-medium border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50">
                  <Download size={10} /> Template Excel
                </a>
              )}
            </div>
            <textarea
              ref={textareaRef}
              rows={3}
              className="w-full px-3 py-2 th-card border th-border rounded-lg text-xs font-mono th-text focus:outline-none focus:border-accent resize-none"
              placeholder={`Paste data tab-separated, contoh:\nGeprek Dada\tGeprek\t17000\nEs Teh\tMinuman\t5000`}
            />
            <div className="flex gap-2">
              <button onClick={handlePaste} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50">
                <Upload size={12} className="inline mr-1" /> Parse Paste
              </button>
              <span className="text-[10px] th-muted self-center">Copy dari Excel → paste di atas → Parse</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold th-muted">{rows.length} baris</span>
              <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 text-success rounded-lg text-xs font-medium border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50">
                <Plus size={12} /> Tambah Baris
              </button>
            </div>

            {rows.map((row, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 th-surface rounded-xl border th-border/50">
                <span className="text-xs th-muted font-mono w-5 text-center pt-2 shrink-0">{idx + 1}</span>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {columns.map((col) => (
                    <div key={col.key}>
                      <label className="text-[10px] th-muted uppercase mb-0.5 block">{col.label}{col.required && "*"}</label>
                      {col.type === "select" ? (
                        <select
                          value={row[col.key]}
                          onChange={(e) => updateCell(idx, col.key, e.target.value)}
                          className="w-full px-2 py-1.5 th-card border th-border rounded-lg text-xs th-text focus:outline-none focus:border-accent"
                        >
                          <option value="">Pilih...</option>
                          {col.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          type={col.type}
                          value={row[col.key]}
                          onChange={(e) => updateCell(idx, col.key, e.target.value)}
                          placeholder={col.placeholder}
                          className="w-full px-2 py-1.5 th-card border th-border rounded-lg text-xs th-text focus:outline-none focus:border-accent"
                        />
                      )}
                    </div>
                  ))}
                </div>
                {rows.length > 1 && (
                  <button onClick={() => removeRow(idx)} className="p-1.5 th-muted hover:text-danger shrink-0"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t th-border shrink-0 space-y-2">
          {result && (
            <p className={`text-sm font-medium text-center ${result.errors === 0 ? "text-success" : "text-warning"}`}>
              {result.saved} berhasil disimpan{result.errors > 0 ? `, ${result.errors} gagal` : ""}
            </p>
          )}
          <div className="flex gap-3">
            <button  className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Tutup</button>
            <button onClick={handleSave} disabled={saving || rows.length === 0} className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 touch-target">
              {saving ? "Menyimpan..." : `Simpan ${rows.length} Item`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

