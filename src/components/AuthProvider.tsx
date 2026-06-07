"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { getSettings, updateSetting } from "@/lib/whatsapp";

interface AuthContextType {
  pinVerified: boolean;
  verifyPin: (pin: string) => Promise<boolean>;
  changePin: (newPin: string) => Promise<void>;
  isProtectedRoute: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  pinVerified: false,
  verifyPin: async () => false,
  changePin: async () => {},
  isProtectedRoute: () => false,
});

const PROTECTED_ROUTES = ["/kas", "/pengaturan"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pinVerified, setPinVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const session = localStorage.getItem("pin_session");
      if (session === "verified") setPinVerified(true);
    } catch {}
    setLoading(false);
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const settings = await getSettings();
      const storedPin = settings.admin_pin || "271222";
      if (pin === storedPin) {
        setPinVerified(true);
        localStorage.setItem("pin_session", "verified");
        return true;
      }
      return false;
    } catch {
      if (pin === "271222") {
        setPinVerified(true);
        localStorage.setItem("pin_session", "verified");
        return true;
      }
      return false;
    }
  }, []);

  const changePin = useCallback(async (newPin: string) => {
    await updateSetting("admin_pin", newPin);
  }, []);

  const isProtectedRoute = useCallback((path: string) => {
    return PROTECTED_ROUTES.some((r) => path.startsWith(r));
  }, []);

  const value = useMemo(() => ({
    pinVerified,
    verifyPin,
    changePin,
    isProtectedRoute,
  }), [pinVerified, verifyPin, changePin, isProtectedRoute]);

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
