"use client";
import React from "react";
import { useCompareState, useCompareActions } from "./CompareProvider";

interface CompareCheckboxProps {
  bracketId: string;
  className?: string;
}

function CompareCheckboxInner({ bracketId, className = "" }: CompareCheckboxProps) {
  const { isSelected } = useCompareState();
  const { toggle } = useCompareActions();
  const checked = isSelected(bracketId);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); toggle(bracketId); }}
      className={`
        w-5 h-5 min-w-[20px] min-h-[20px] rounded-full flex items-center justify-center
        transition-all duration-150 shrink-0
        ${checked
          ? "bg-secondary border border-secondary text-surface opacity-100"
          : "border-[1.5px] border-on-surface-variant/50 sm:border-on-surface-variant/30 sm:opacity-0 sm:group-hover:opacity-100 opacity-60 hover:border-secondary hover:bg-secondary/15 hover:shadow-[0_0_6px_rgba(0,244,254,0.4)]"
        }
        ${className}
      `}
      aria-label={checked ? "Deselect for comparison" : "Select for comparison"}
    >
      {checked && (
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

const CompareCheckbox = React.memo(CompareCheckboxInner);
export default CompareCheckbox;
