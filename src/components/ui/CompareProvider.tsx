"use client";
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

/* ── Split into two contexts ──
   1. CompareStateContext — holds `selected` and `isSelected` (changes when selection changes)
   2. CompareActionsContext — holds `toggle` and `clear` (stable, never changes)
   Components that only need actions (e.g. CompareCheckbox toggle) won't re-render on selection changes.
*/

interface CompareStateContextType {
  selected: string[];
  isSelected: (id: string) => boolean;
}

interface CompareActionsContextType {
  toggle: (id: string) => void;
  clear: () => void;
}

const CompareStateContext = createContext<CompareStateContextType>({
  selected: [],
  isSelected: () => false,
});

const CompareActionsContext = createContext<CompareActionsContextType>({
  toggle: () => {},
  clear: () => {},
});

/** Read selected state — re-renders when selection changes */
export function useCompareState() {
  return useContext(CompareStateContext);
}

/** Read actions only — stable, never causes re-render */
export function useCompareActions() {
  return useContext(CompareActionsContext);
}

/** Legacy hook — returns both state and actions (same API as before) */
export function useCompare() {
  const state = useContext(CompareStateContext);
  const actions = useContext(CompareActionsContext);
  return useMemo(
    () => ({ ...state, ...actions }),
    [state, actions]
  );
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

  // Stable Set for O(1) lookups — only recreated when `selected` changes
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  // Actions value is stable (toggle and clear never change)
  const actionsValue = useMemo(
    () => ({ toggle, clear }),
    [toggle, clear]
  );

  // State value changes only when selected changes
  const stateValue = useMemo(
    () => ({ selected, isSelected }),
    [selected, isSelected]
  );

  return (
    <CompareActionsContext.Provider value={actionsValue}>
      <CompareStateContext.Provider value={stateValue}>
        {children}
      </CompareStateContext.Provider>
    </CompareActionsContext.Provider>
  );
}
