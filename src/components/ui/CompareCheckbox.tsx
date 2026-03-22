"use client";
import { useCompare } from "./CompareProvider";

interface CompareCheckboxProps {
  bracketId: string;
  className?: string;
}

export default function CompareCheckbox({ bracketId, className = "" }: CompareCheckboxProps) {
  const { toggle, isSelected } = useCompare();
  const checked = isSelected(bracketId);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(bracketId); }}
      className={`
        w-6 h-6 min-w-[24px] min-h-[24px] rounded-full border-2 flex items-center justify-center
        transition-all duration-150 shrink-0
        ${checked
          ? "bg-secondary border-secondary text-surface"
          : "border-outline-variant hover:border-secondary/50 hover:bg-secondary/10"
        }
        ${className}
      `}
      aria-label={checked ? "Deselect for comparison" : "Select for comparison"}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
