"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface SortOption {
  key: string;
  label: string;
}

interface MobileSortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (key: string) => void;
}

export default function MobileSortDropdown({ options, value, onChange }: MobileSortDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find((o) => o.key === value)?.label ?? value;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  const handleSelect = useCallback(
    (key: string) => {
      onChange(key);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <div className="sm:hidden mb-3 relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface text-sm min-h-[44px] transition-colors hover:bg-surface-bright"
      >
        <span className="truncate">{selectedLabel}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 ml-2 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-surface-container border border-outline-variant rounded-lg shadow-2xl shadow-black/30 overflow-hidden">
          {options.map((o) => {
            const isSelected = o.key === value;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => handleSelect(o.key)}
                className={`w-full text-left px-3 py-2.5 text-sm flex items-center justify-between transition-colors min-h-[44px] ${
                  isSelected
                    ? "bg-surface-bright text-on-surface"
                    : "text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
                }`}
              >
                <span>{o.label}</span>
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary shrink-0"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
