"use client";
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface MyBracketContextType {
  myBracketId: string | null;
  setMyBracket: (id: string | null) => void;
  isMyBracket: (id: string) => boolean;
}

const MyBracketContext = createContext<MyBracketContextType>({
  myBracketId: null,
  setMyBracket: () => {},
  isMyBracket: () => false,
});

export function useMyBracket() {
  return useContext(MyBracketContext);
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

  return (
    <MyBracketContext.Provider value={{ myBracketId, setMyBracket, isMyBracket }}>
      {children}
    </MyBracketContext.Provider>
  );
}
