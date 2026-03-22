"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useMyBracket } from "@/components/ui/MyBracketProvider";
import { displayName } from "@/lib/constants";
import type { Bracket } from "@/lib/types";

interface MyBracketBadgeProps {
  brackets: Bracket[];
}

export default function MyBracketBadge({ brackets }: MyBracketBadgeProps) {
  const { myBracketId, setMyBracket } = useMyBracket();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
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

  const pinned = brackets.find((b) => b.id === myBracketId);
  const pinnedRank = pinned ? rankMap.get(pinned.id) : null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return brackets
      .filter((b) => {
        if (!q) return true;
        return (
          b.name.toLowerCase().includes(q) ||
          b.owner.toLowerCase().includes(q) ||
          (b.full_name || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.points - a.points);
  }, [brackets, search]);

  if (brackets.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      {pinned ? (
        <button
          onClick={() => { setOpen(!open); setSearch(""); }}
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
          onClick={() => { setOpen(!open); setSearch(""); }}
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
        <div className="absolute top-full right-0 mt-1 w-72 max-h-80 bg-surface-container border border-outline-variant rounded-lg shadow-2xl shadow-black/30 z-50 flex flex-col overflow-hidden">
          {/* Search */}
          <div className="relative border-b border-outline-variant">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brackets..."
              className="w-full px-3 py-2 pl-9 bg-transparent text-on-surface text-xs outline-none placeholder:text-on-surface-variant"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {filtered.map((b) => {
              const isPinned = b.id === myBracketId;
              const rank = rankMap.get(b.id);
              const primary = displayName(b);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setMyBracket(isPinned ? null : b.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-surface-bright flex items-center gap-2 min-h-[36px] transition-colors ${
                    isPinned ? "bg-secondary/5" : ""
                  }`}
                >
                  <span className="font-label text-on-surface-variant w-6 text-right shrink-0">#{rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate ${isPinned ? "text-secondary" : "text-on-surface"}`}>{primary}</div>
                    {primary !== b.name && (
                      <div className="text-[10px] text-on-surface-variant truncate">{b.name}</div>
                    )}
                  </div>
                  <span className="font-label text-on-surface-variant shrink-0">{b.points} pts</span>
                  {isPinned && (
                    <span className="text-secondary text-[10px] shrink-0">Pinned</span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-on-surface-variant text-xs text-center py-4">No matches</p>
            )}
          </div>

          {/* Clear */}
          {pinned && (
            <button
              type="button"
              onClick={() => { setMyBracket(null); setOpen(false); }}
              className="px-3 py-2 text-[10px] font-label text-on-surface-variant hover:text-on-surface border-t border-outline-variant transition-colors"
            >
              Clear my bracket
            </button>
          )}
        </div>
      )}
    </div>
  );
}
