"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface CompareContextType {
  selected: string[];           // bracket IDs, max 2
  toggle: (id: string) => void; // add/remove, FIFO if > 2
  clear: () => void;
  isSelected: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextType>({
  selected: [],
  toggle: () => {},
  clear: () => {},
  isSelected: () => false,
});

export function useCompare() {
  return useContext(CompareContext);
}

export default function CompareProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // FIFO: drop oldest
      return [...prev, id];
    });
  }, []);

  const clear = useCallback(() => setSelected([]), []);
  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);

  return (
    <CompareContext.Provider value={{ selected, toggle, clear, isSelected }}>
      {children}
    </CompareContext.Provider>
  );
}
