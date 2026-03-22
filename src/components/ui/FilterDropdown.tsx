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
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Compact display text: 0 -> placeholder, 1 -> name, 2+ -> name +N more
  const displayText = useMemo(() => {
    if (selected.length === 0) return "";
    const firstOption = options.find((o) => o.value === selected[0]);
    const firstName = firstOption?.label || selected[0];
    if (selected.length === 1) return firstName;
    return `${firstName} +${selected.length - 1} more`;
  }, [selected, options]);

  const placeholderText = `Filter by ${label.toLowerCase()}...`;

  // When the dropdown opens, the input field is for searching.
  // When closed, show the compact selected display.
  const inputValue = open ? search : displayText;

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        {/* Search icon */}
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
          ref={inputRef}
          type="text"
          readOnly={!searchable || !open}
          value={inputValue}
          placeholder={placeholderText}
          onFocus={() => {
            setOpen(true);
            setSearch("");
          }}
          onClick={() => {
            if (!open) {
              setOpen(true);
              setSearch("");
            }
          }}
          onChange={(e) => {
            if (searchable && open) {
              setSearch(e.target.value);
            }
          }}
          className={`w-full rounded-card bg-surface-container border px-3 py-2.5 pl-9 pr-8 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer min-w-[200px] min-h-[36px] ${
            hasSelections
              ? "text-on-surface border-primary/30"
              : "text-on-surface-variant border-outline"
          } placeholder:text-on-surface-variant`}
        />

        {/* Clear button when items are selected */}
        {hasSelections && !open && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface transition-colors"
            aria-label="Clear selection"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}

        {/* Selection count badge */}
        {hasSelections && selected.length > 1 && (
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] text-primary font-medium pointer-events-none">
            ({selected.length})
          </span>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full min-w-[240px] max-h-72 bg-surface-container border border-outline rounded-card shadow-2xl shadow-black/30 z-50 flex flex-col overflow-hidden">
          {searchable && (
            <div className="relative border-b border-outline">
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
          <div className="sticky top-0 bg-surface-container px-3 py-1.5 border-b border-outline">
            <span className="text-[10px] text-on-surface-variant">
              {selected.length > 0
                ? `${selected.length} selected of ${options.length}`
                : `${filtered.length} ${label.toLowerCase()}`}
            </span>
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.map((o) => {
              const isSelected = selectedSet.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={`w-full text-left px-3 py-2.5 text-xs hover:bg-surface-bright flex items-center gap-2 min-h-[36px] transition-colors border-l-2 ${
                    isSelected
                      ? "bg-surface-bright border-l-primary"
                      : "border-l-transparent"
                  }`}
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
              className="px-3 py-2 text-[10px] font-label text-on-surface-variant hover:text-on-surface border-t border-outline transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
