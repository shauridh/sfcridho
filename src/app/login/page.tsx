"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || pin.length < 4) {
      setError("Masukkan username dan PIN 4 digit");
      return;
    }
    setLoading(true);
    setError("");
    const { error: err } = await login(username, pin);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center th-bg p-4">
      <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-6 text-center border-b th-border">
          <div className="w-16 h-16 th-accent-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-xl font-bold th-text">Sabana FC POS</h1>
          <p className="text-sm th-text-secondary mt-1">Masuk untuk melanjutkan</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">Username</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 th-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                autoFocus
                className="w-full pl-10 pr-3 py-3 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"
                placeholder="admin"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">PIN</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 th-muted" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, "")); setError(""); }}
                className="w-full pl-10 pr-3 py-3 th-card border th-border rounded-xl text-lg th-text font-bold tracking-[0.5em] focus:outline-none focus:border-accent text-center"
                placeholder="····"
              />
            </div>
          </div>
          {error && <p className="text-sm text-danger text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 th-accent-bg text-white rounded-xl font-bold hover:opacity-90 transition-colors disabled:opacity-50 touch-target"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
          <p className="text-xs th-muted text-center mt-2">
            Default: admin / 1234 (owner) atau kasir1 / 1234
          </p>
        </form>
      </div>
    </div>
  );
}
