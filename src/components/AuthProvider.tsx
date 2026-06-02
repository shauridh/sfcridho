"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { AppUser } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, pin: string) => Promise<{ error: string | null }>;
  logout: () => void;
  isOwner: boolean;
  isKasir: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ error: null }),
  logout: () => {},
  isOwner: false,
  isKasir: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_user");
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {}
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, pin: string) => {
    try {
      const { data, error } = await supabase.rpc("verify_login", {
        p_username: username,
        p_pin: pin,
      });

      if (error || !data || data.length === 0) {
        return { error: "Username atau PIN salah" };
      }

      const u: AppUser = data[0];
      setUser(u);
      localStorage.setItem("pos_user", JSON.stringify(u));
      return { error: null };
    } catch {
      return { error: "Gagal terhubung ke server" };
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("pos_user");
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    isOwner: user?.role === "owner",
    isKasir: user?.role === "kasir",
  }), [user, loading, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
