"use client";
import { useState, useRef, useEffect, useMemo } from "react";

interface FilterDropdownProps {
  label: string;
  options: { value: string; label: string; sublabel?: string; logo?: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
}

export default function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  searchable = false,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
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

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  // Sort: selected items first, then filter by search
  const filtered = useMemo(() => {
    const list = search
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(search.toLowerCase()) ||
            o.sublabel?.toLowerCase().includes(search.toLowerCase())
        )
      : options;
    return [...list].sort((a, b) => {
      const aS = selectedSet.has(a.value) ? 0 : 1;
      const bS = selectedSet.has(b.value) ? 0 : 1;
      return aS - bS;
    });
  }, [options, search, selectedSet]);

  const hasSelections = selected.length > 0;
  const buttonLabel = hasSelections ? `${label} (${selected.length})` : label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) setSearch("");
        }}
        className={`
          px-3 py-1.5 rounded-lg text-sm font-medium transition-colors min-h-[36px] flex items-center gap-1
          ${
            hasSelections
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-surface-bright text-on-surface-variant border border-outline-variant hover:border-on-surface-variant"
          }
        `}
      >
        {buttonLabel}
        <span className="text-[10px] ml-0.5">&#9662;</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 max-h-72 bg-surface-container border border-outline-variant rounded-lg shadow-2xl shadow-black/30 z-50 flex flex-col overflow-hidden">
          {searchable && (
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
                placeholder={`Search ${label.toLowerCase()}...`}
                className="w-full px-3 py-2 pl-9 bg-transparent text-on-surface text-xs outline-none placeholder:text-on-surface-variant"
                autoFocus
              />
            </div>
          )}
          <div className="overflow-y-auto flex-1">
            {filtered.map((o) => {
              const isSelected = selectedSet.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-surface-bright flex items-center gap-2 min-h-[36px] transition-colors"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "bg-primary border-primary text-surface"
                        : "border-outline-variant"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 12 12"
                        fill="none"
                      >
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    {o.logo && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={o.logo}
                        alt=""
                        className="w-5 h-5 rounded-full bg-on-surface/10 p-[2px] shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-on-surface truncate">{o.label}</div>
                      {o.sublabel && (
                        <div className="text-[10px] text-on-surface-variant truncate">
                          {o.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-on-surface-variant text-xs text-center py-4">
                No matches
              </p>
            )}
          </div>
          {hasSelections && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="px-3 py-2 text-[10px] font-label text-on-surface-variant hover:text-on-surface border-t border-outline-variant transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
