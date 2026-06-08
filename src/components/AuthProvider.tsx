"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { AppUser } from "@/lib/types";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  currentUser: AppUser | null;
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: async () => ({ success: false }),
  logout: () => {},
  loading: true,
});

const SESSION_KEY = "sabana_user_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const user = JSON.parse(stored) as AppUser;
        if (user.id && user.username && user.role) {
          setCurrentUser(user);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.rpc("verify_login", {
        p_username: username.trim(),
        p_pin: pin.trim(),
      });

      if (error) return { success: false, error: "Gagal verifikasi: " + error.message };
      if (!data || data.length === 0) return { success: false, error: "Username atau PIN salah" };

      const user: AppUser = {
        id: data[0].id,
        username: data[0].username,
        nama: data[0].nama,
        role: data[0].role,
        aktif: true,
      };

      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Terjadi kesalahan" };
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo(() => ({
    currentUser,
    login,
    logout,
    loading,
  }), [currentUser, login, logout, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center th-bg">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
