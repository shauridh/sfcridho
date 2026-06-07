"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function AdminPinModal({ title, message, onConfirm, onClose }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) { setError("Masukkan PIN 4 digit"); return; }
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data } = await supabase.rpc("verify_login", { p_username: "admin", p_pin: pin });
      if (!data || data.length === 0) {
        setError("PIN salah");
        return;
      }
      onConfirm();
    } catch {
      setError("Gagal verifikasi");
    }
  };

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-[60] p-4" >
      <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b th-border">
          <h2 className="text-lg font-bold th-text">{title}</h2>
          <button  className="p-2 th-muted hover:th-text"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm th-text-secondary">{message}</p>
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">PIN Admin</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, "")); setError(""); }}
              autoFocus
              className="w-full px-4 py-3 th-card border th-border rounded-xl text-lg font-bold th-text tracking-[0.5em] focus:outline-none focus:border-accent text-center"
              placeholder="Â·Â·Â·Â·"
            />
          </div>
          {error && <p className="text-sm text-danger text-center">{error}</p>}
          <div className="flex gap-3">
            <button type="button"  className="flex-1 py-3 border th-border rounded-xl text-sm font-medium th-muted touch-target">Batal</button>
            <button type="submit" className="flex-1 py-3 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 touch-target">Konfirmasi</button>
          </div>
        </form>
      </div>
    </div>
  );
}

