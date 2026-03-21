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
    <div className="flex gap-1 rounded-card bg-surface-container p-1">
      {ROUND_ORDER.map((round) => (
        <button
          key={round}
          onClick={() => onSelect(round)}
          className={`
            rounded-card px-3 py-1.5 font-label text-xs transition-colors
            ${
              selected === round
                ? "bg-surface-bright text-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }
          `}
        >
          {ROUND_LABELS[round]}
        </button>
      ))}
    </div>
  );
}
