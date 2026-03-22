"use client";
import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";

/* ── Split into two contexts ──
   1. MyBracketStateContext — holds `myBracketId` and `isMyBracket` (changes when bracket changes)
   2. MyBracketActionsContext — holds `setMyBracket` (stable, never changes)
*/

interface MyBracketStateContextType {
  myBracketId: string | null;
  isMyBracket: (id: string) => boolean;
}

interface MyBracketActionsContextType {
  setMyBracket: (id: string | null) => void;
}

const MyBracketStateContext = createContext<MyBracketStateContextType>({
  myBracketId: null,
  isMyBracket: () => false,
});

const MyBracketActionsContext = createContext<MyBracketActionsContextType>({
  setMyBracket: () => {},
});

/** Read bracket state — re-renders when myBracketId changes */
export function useMyBracketState() {
  return useContext(MyBracketStateContext);
}

/** Read actions only — stable, never causes re-render */
export function useMyBracketActions() {
  return useContext(MyBracketActionsContext);
}

/** Legacy hook — returns both state and actions (same API as before) */
export function useMyBracket() {
  const state = useContext(MyBracketStateContext);
  const actions = useContext(MyBracketActionsContext);
  return useMemo(
    () => ({ ...state, ...actions }),
    [state, actions]
  );
}

export default function MyBracketProvider({ children }: { children: ReactNode }) {
  const [myBracketId, setMyBracketIdState] = useState<string | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("myBracketId");
    if (stored) setMyBracketIdState(stored);
  }, []);

  const setMyBracket = useCallback((id: string | null) => {
    setMyBracketIdState(id);
    if (id) localStorage.setItem("myBracketId", id);
    else localStorage.removeItem("myBracketId");
  }, []);

  const isMyBracket = useCallback((id: string) => id === myBracketId, [myBracketId]);

  // Actions value is stable (setMyBracket never changes)
  const actionsValue = useMemo(
    () => ({ setMyBracket }),
    [setMyBracket]
  );

  // State value changes only when myBracketId changes
  const stateValue = useMemo(
    () => ({ myBracketId, isMyBracket }),
    [myBracketId, isMyBracket]
  );

  return (
    <MyBracketActionsContext.Provider value={actionsValue}>
      <MyBracketStateContext.Provider value={stateValue}>
        {children}
      </MyBracketStateContext.Provider>
    </MyBracketActionsContext.Provider>
  );
}
