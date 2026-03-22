"use client";
import { useCompare } from "./CompareProvider";
import { useRouter } from "next/navigation";
import type { Bracket } from "@/lib/types";
import { displayName } from "@/lib/constants";

interface CompareBarProps {
  brackets: Bracket[];
}

export default function CompareBar({ brackets }: CompareBarProps) {
  const { selected, toggle, clear } = useCompare();
  const router = useRouter();

  if (selected.length === 0) return null;

  const selectedBrackets = selected.map((id) => brackets.find((b) => b.id === id)).filter(Boolean);

  const handleCompare = () => {
    if (selected.length === 2) {
      router.push(`/head-to-head?b1=${selected[0]}&b2=${selected[1]}`);
      clear();
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-secondary/30 bg-secondary/10 text-secondary text-sm truncate max-w-[180px] cursor-pointer hover:bg-secondary/20 transition-colors"
            >
              <span className="truncate">{displayName(b)}</span>
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
