"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useMyBracket } from "@/components/ui/MyBracketProvider";
import MultiSelectSearch from "@/components/ui/MultiSelectSearch";
import type { MultiSelectOption } from "@/components/ui/MultiSelectSearch";
import { displayName } from "@/lib/constants";
import type { Bracket } from "@/lib/types";

interface MyBracketBadgeProps {
  brackets: Bracket[];
}

export default function MyBracketBadge({ brackets }: MyBracketBadgeProps) {
  const { myBracketId, setMyBracket } = useMyBracket();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Compute rank for each bracket (sorted by points desc)
  const rankMap = useMemo(() => {
    const sorted = [...brackets].sort((a, b) => b.points - a.points);
    const map = new Map<string, number>();
    sorted.forEach((b, i) => map.set(b.id, i + 1));
    return map;
  }, [brackets]);

  // Build bracket options for MultiSelectSearch
  const bracketOptions: MultiSelectOption[] = useMemo(
    () => brackets.map((b) => {
      const primary = displayName(b);
      return { value: b.id, label: primary, sublabel: b.name !== primary ? b.name : undefined };
    }),
    [brackets]
  );

  const pinned = brackets.find((b) => b.id === myBracketId);
  const pinnedRank = pinned ? rankMap.get(pinned.id) : null;

  const handleSelect = useCallback(
    (id: string) => {
      // Toggle: if already pinned, unpin; otherwise pin the new one
      if (id === myBracketId) {
        setMyBracket(null);
      } else {
        setMyBracket(id);
      }
      setOpen(false);
    },
    [myBracketId, setMyBracket]
  );

  const handleClear = useCallback(() => {
    setMyBracket(null);
    setOpen(false);
  }, [setMyBracket]);

  if (brackets.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      {pinned ? (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 rounded-card bg-secondary/10 border border-secondary/20 px-2.5 py-1 text-xs font-label text-secondary hover:bg-secondary/15 transition-colors max-w-[200px]"
          title="My Bracket — click to change"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 shrink-0">
            <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z" />
          </svg>
          <span className="truncate">{displayName(pinned)}</span>
          <span className="text-secondary/70">#{pinnedRank}</span>
          <span className="text-secondary/50">&middot;</span>
          <span className="text-secondary/70">{pinned.points}&nbsp;pts</span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 rounded-card bg-surface-bright border border-outline-variant px-2.5 py-1 text-xs font-label text-on-surface-variant hover:text-on-surface hover:border-on-surface-variant transition-colors"
          title="Pin your bracket for highlights across all pages"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
            <path d="M12 2C8.1 2 5 5.1 5 9c0 5.3 7 13 7 13s7-7.7 7-13c0-3.9-3.1-7-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </svg>
          <span>My Bracket</span>
        </button>
      )}

      {open && (
        <div className="absolute top-full right-0 mt-1 w-72 z-50">
          <MultiSelectSearch
            mode="single"
            label="Brackets"
            options={bracketOptions}
            selectedId={myBracketId ?? undefined}
            onSelect={handleSelect}
            onClear={handleClear}
            placeholder="Find your bracket..."
          />
          {/* Clear my bracket */}
          {pinned && (
            <div className="mt-1 rounded-card bg-surface-container border border-outline-variant">
              <button
                type="button"
                onClick={handleClear}
                className="w-full px-3 py-2 text-[10px] font-label text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Clear my bracket
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
