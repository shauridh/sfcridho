"use client";

import { useState, useRef, useEffect } from "react";
import { X, Delete } from "lucide-react";

interface Props {
  onClose: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  title?: string;
}

export default function PinModal({ onClose, onVerify, title = "Masukkan PIN" }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDigit = (d: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + d;
    setPin(newPin);
    setError("");
    if (newPin.length === 6) {
      submitPin(newPin);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const submitPin = async (p: string) => {
    setLoading(true);
    const ok = await onVerify(p);
    if (!ok) {
      setError("PIN salah");
      setPin("");
    }
    setLoading(false);
  };

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

  return (
    <div className="fixed inset-0 th-overlay flex items-center justify-center z-[60] p-4">
      <div className="th-card border th-border rounded-2xl w-full max-w-xs shadow-xl">
        <div className="flex items-center justify-between p-4 border-b th-border">
          <h2 className="text-base font-bold th-text">{title}</h2>
          <button onClick={onClose} className="p-1.5 th-muted hover:th-text rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex justify-center gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-colors ${
                  i < pin.length
                    ? "border-accent bg-red-50 dark:bg-red-950/30 th-accent"
                    : "th-border th-muted"
                }`}
              >
                {i < pin.length ? "•" : ""}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-danger text-center">{error}</p>}
          {loading && <p className="text-sm th-muted text-center">Memverifikasi...</p>}

          <div className="grid grid-cols-3 gap-2">
            {digits.map((d, i) => {
              if (d === "") return <div key={i} />;
              if (d === "del") {
                return (
                  <button
                    key={i}
                    onClick={handleDelete}
                    className="h-14 rounded-xl flex items-center justify-center th-muted hover:th-text hover:th-surface transition-colors touch-target"
                  >
                    <Delete size={22} />
                  </button>
                );
              }
              return (
                <button
                  key={i}
                  onClick={() => handleDigit(d)}
                  disabled={loading}
                  className="h-14 rounded-xl text-xl font-bold th-text hover:th-surface border th-border transition-colors touch-target disabled:opacity-50"
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
