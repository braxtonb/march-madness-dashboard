"use client";
import { useMemo } from "react";
import { useCompareState, useCompareActions } from "./CompareProvider";
import { useRouter, usePathname } from "next/navigation";
import type { Bracket } from "@/lib/types";

interface CompareBarProps {
  brackets: Bracket[];
}

export default function CompareBar({ brackets }: CompareBarProps) {
  const { selected } = useCompareState();
  const { toggle, clear } = useCompareActions();
  const router = useRouter();
  const pathname = usePathname();

  // Memoize bracket lookup map to avoid filtering 75 brackets on every render
  const bracketMap = useMemo(() => {
    const map = new Map<string, Bracket>();
    for (const b of brackets) map.set(b.id, b);
    return map;
  }, [brackets]);

  const selectedBrackets = useMemo(
    () => selected.map((id) => bracketMap.get(id)).filter(Boolean),
    [selected, bracketMap]
  );

  if (selected.length === 0) return null;

  const handleCompare = () => {
    if (selected.length === 2) {
      const b1 = selected[0];
      const b2 = selected[1];
      const url = `/head-to-head?b1=${b1}&b2=${b2}`;
      clear();
      if (pathname === "/head-to-head") {
        // Already on head-to-head — dispatch custom event so HeadToHeadContent picks up the IDs
        window.history.replaceState(null, "", url);
        window.dispatchEvent(new CustomEvent("compare-navigate", { detail: { b1, b2 } }));
      } else {
        router.push(url);
      }
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] glass border-t border-outline-variant animate-[bottom-sheet-slide-up_0.2s_ease-out]">
      <div className="max-w-5xl mx-auto px-4 py-3 sm:py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedBrackets.map((b) => b && (
            <button
              key={b.id}
              onClick={() => toggle(b.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-xs sm:text-sm truncate max-w-[140px] sm:max-w-[220px] cursor-pointer hover:bg-secondary/20 transition-colors"
              title={b.full_name && b.full_name !== b.name ? `${b.name} (${b.full_name})` : b.name}
            >
              <span className="truncate">{b.name}</span>
              {b.full_name && b.full_name !== b.name && (
                <span className="text-secondary/60 text-xs truncate hidden sm:inline">({b.full_name})</span>
              )}
              <span className="shrink-0 min-w-[20px] min-h-[20px] flex items-center justify-center">
                ✕
              </span>
            </button>
          ))}
          {selected.length === 1 && (
            <span className="text-on-surface-variant text-sm hidden sm:inline">Select one more to compare</span>
          )}
        </div>
        <button
          onClick={handleCompare}
          disabled={selected.length < 2}
          className={`
            px-4 py-2 rounded-lg font-semibold text-sm transition-all min-w-[44px] min-h-[44px]
            ${selected.length === 2
              ? "bg-secondary text-surface hover:bg-secondary/90 cursor-pointer"
              : "bg-surface-bright text-on-surface-variant cursor-not-allowed opacity-50"
            }
          `}
        >
          Compare
        </button>
      </div>
    </div>
  );
}
