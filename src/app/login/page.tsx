"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Lock, User, LogIn } from "lucide-react";

export default function LoginPage() {
  const { login, currentUser } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (currentUser) {
    router.replace("/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !pin.trim()) {
      setError("Username dan PIN wajib diisi");
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(username, pin);
    if (result.success) {
      router.replace("/dashboard");
    } else {
      setError(result.error || "Login gagal");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen th-bg flex items-center justify-center p-4">
      <div className="th-card border th-border rounded-2xl w-full max-w-sm shadow-xl">
        <div className="p-6 text-center border-b th-border">
          <div className="w-14 h-14 th-accent-bg rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold th-text">Sabana FC</h1>
          <p className="text-xs th-text-secondary mt-1">Masuk untuk melanjutkan</p>
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
                className="w-full pl-10 pr-3 py-2.5 th-card border th-border rounded-xl text-sm th-text focus:outline-none focus:border-accent"
                placeholder="Masukkan username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold th-muted uppercase mb-1.5">PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/[^0-9]/g, "")); setError(""); }}
              className="w-full px-3 py-3 th-card border th-border rounded-xl text-xl font-bold th-text focus:outline-none focus:border-accent tracking-[0.5em] text-center"
              placeholder="······"
            />
          </div>

          {error && (
            <p className="text-sm text-danger text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !pin.trim()}
            className="w-full py-3 th-accent-bg text-white rounded-xl font-bold text-sm hover:opacity-90 disabled:opacity-50 touch-target flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
