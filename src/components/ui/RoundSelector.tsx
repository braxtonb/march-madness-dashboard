"use client";

import { ROUND_ORDER, ROUND_LABELS } from "@/lib/constants";
import type { Round } from "@/lib/types";

interface RoundSelectorProps {
  selected: string;
  onSelect: (round: string) => void;
  labels?: Record<string, string>;
  extraOptions?: { value: string; label: string }[];
}

export function RoundSelector({
  selected,
  onSelect,
  labels,
  extraOptions,
}: RoundSelectorProps) {
  const roundLabels = labels ?? ROUND_LABELS;

  return (
    <div className="overflow-x-auto no-scrollbar">
      <div className="flex gap-1 rounded-card bg-surface-container p-1 min-w-max">
        {extraOptions && extraOptions.length > 0 && (
          <>
            {extraOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className={`
                  rounded-card px-2.5 py-1 font-label text-xs h-7 transition-colors
                  ${
                    selected === opt.value
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-on-surface-variant hover:text-on-surface"
                  }
                `}
              >
                {opt.label}
              </button>
            ))}
            <div className="w-px bg-on-surface-variant/20 my-1 mx-1" />
          </>
        )}
        {ROUND_ORDER.map((round) => (
          <button
            key={round}
            onClick={() => onSelect(round)}
            className={`
              rounded-card px-2.5 py-1 font-label text-xs h-7 transition-colors
              ${
                selected === round
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-on-surface-variant hover:text-on-surface"
              }
            `}
          >
            {roundLabels[round] ?? round}
          </button>
        ))}
      </div>
    </div>
  );
}
