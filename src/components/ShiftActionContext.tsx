"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ShiftActionContextType {
  showTutupShift: boolean;
  onTutupShift: (() => void) | null;
  registerCloseAction: (action: () => void) => void;
  unregisterCloseAction: () => void;
}

const ShiftActionContext = createContext<ShiftActionContextType>({
  showTutupShift: false,
  onTutupShift: null,
  registerCloseAction: () => {},
  unregisterCloseAction: () => {},
});

export function ShiftActionProvider({ children }: { children: ReactNode }) {
  const [onTutupShift, setOnTutupShift] = useState<(() => void) | null>(null);

  const registerCloseAction = useCallback((action: () => void) => {
    setOnTutupShift(() => action);
  }, []);

  const unregisterCloseAction = useCallback(() => {
    setOnTutupShift(null);
  }, []);

  return (
    <ShiftActionContext.Provider value={{
      showTutupShift: onTutupShift !== null,
      onTutupShift,
      registerCloseAction,
      unregisterCloseAction,
    }}>
      {children}
    </ShiftActionContext.Provider>
  );
}

export const useShiftAction = () => useContext(ShiftActionContext);
