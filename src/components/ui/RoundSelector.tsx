"use client";

import { ROUND_ORDER, ROUND_LABELS } from "@/lib/constants";
import type { Round } from "@/lib/types";

export function RoundSelector({
  selected,
  onSelect,
}: {
  selected: Round;
  onSelect: (round: Round) => void;
}) {
  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex gap-1 rounded-card bg-surface-container p-1 min-w-max">
        {ROUND_ORDER.map((round) => (
          <button
            key={round}
            onClick={() => onSelect(round)}
            className={`
              rounded-card px-3 py-1.5 font-label text-sm transition-colors
              ${
                selected === round
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-on-surface-variant hover:text-on-surface"
              }
            `}
          >
            {ROUND_LABELS[round]}
          </button>
        ))}
      </div>
    </div>
  );
}
