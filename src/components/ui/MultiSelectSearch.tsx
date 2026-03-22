"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

/* -- types -- */

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  logo?: string;
}

interface MultiSelectSearchProps {
  /** Mode: "multi" for multi-select filtering, "single" for single-select */
  mode: "multi" | "single";

  /** All available options */
  options: MultiSelectOption[];

  /** Label used in compact display (e.g. "Brackets", "Champions") */
  label: string;

  // -- Multi-select props --
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;

  // -- Single-select props --
  selectedId?: string;
  onSelect?: (id: string) => void;
  onClear?: () => void;

  /** Exclude specific value from options (e.g. "other bracket" in H2H) */
  excludeValue?: string;

  /** Placeholder text for the input */
  placeholder?: string;

  /** Optional className on root */
  className?: string;

  /** Optional small label above input */
  inputLabel?: string;

  /** Whether search is enabled (default true) */
  searchable?: boolean;
}

/* -- helpers -- */

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-primary font-semibold">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

/* -- component -- */

function MultiSelectSearchInner({
  mode,
  options,
  label,
  selected = [],
  onSelectedChange,
  selectedId,
  onSelect,
  onClear,
  excludeValue,
  placeholder,
  className = "",
  inputLabel,
  searchable = true,
}: MultiSelectSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isMulti = mode === "multi";

  // Build lookup structures
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const optionMap = useMemo(() => {
    const m = new Map<string, MultiSelectOption>();
    for (const o of options) m.set(o.value, o);
    return m;
  }, [options]);

  // Available options (excluding a value if needed)
  const available = useMemo(() => {
    return excludeValue ? options.filter((o) => o.value !== excludeValue) : options;
  }, [options, excludeValue]);

  // Fix 2: Filtered ONLY — NO reordering based on selection state.
  // Items stay in their original order always. Selected items show a visual indicator.
  const filtered = useMemo(() => {
    if (!query) return available;
    const q = query.toLowerCase();
    return available.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel?.toLowerCase().includes(q))
    );
  }, [available, query]);

  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
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

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-dropdown-item]");
    if (items[highlightedIndex]) {
      items[highlightedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  // Compact display text when dropdown is closed
  const displayText = useMemo(() => {
    if (isMulti) {
      if (selected.length === 0) return "";
      if (selected.length === 1) {
        const opt = optionMap.get(selected[0]);
        return opt?.label || selected[0];
      }
      return `${selected.length} ${label}`;
    } else {
      // single mode
      if (!selectedId) return "";
      const opt = optionMap.get(selectedId);
      return opt?.label || selectedId;
    }
  }, [isMulti, selected, selectedId, optionMap, label]);

  // Display sublabel for single mode when selected
  const displaySublabel = useMemo(() => {
    if (!isMulti && selectedId) {
      const opt = optionMap.get(selectedId);
      if (opt && opt.sublabel && opt.sublabel !== opt.label) return opt.sublabel;
    }
    return null;
  }, [isMulti, selectedId, optionMap]);

  const inputValue = open ? query : displayText;

  const hasSelections = isMulti ? selected.length > 0 : !!selectedId;

  const defaultPlaceholder = placeholder || `Search ${label.toLowerCase()}...`;

  // -- handlers --

  const handleFocus = useCallback(() => {
    setOpen(true);
    setQuery("");
    setHighlightedIndex(-1);
  }, []);

  const handleClick = useCallback(() => {
    if (!open) {
      setOpen(true);
      setQuery("");
      setHighlightedIndex(-1);
    }
  }, [open]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (searchable && open) {
        setQuery(e.target.value);
      }
    },
    [searchable, open]
  );

  const handleItemClick = useCallback(
    (value: string) => {
      if (isMulti) {
        // Toggle selection -- do NOT reset scroll or query
        if (selectedSet.has(value)) {
          onSelectedChange?.(selected.filter((v) => v !== value));
        } else {
          onSelectedChange?.([...selected, value]);
        }
        // Keep dropdown open, keep query intact (Fix 3)
        inputRef.current?.focus();
      } else {
        // Single select
        onSelect?.(value);
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    },
    [isMulti, selected, selectedSet, onSelectedChange, onSelect]
  );

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev + 1;
          return next >= filtered.length ? 0 : next;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const next = prev - 1;
          return next < 0 ? filtered.length - 1 : next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          handleItemClick(filtered[highlightedIndex].value);
        }
      }
    },
    [open, filtered, highlightedIndex, handleItemClick]
  );

  const handleClear = useCallback(() => {
    if (isMulti) {
      onSelectedChange?.([]);
    } else {
      onClear?.();
    }
    setQuery("");
    inputRef.current?.focus();
  }, [isMulti, onSelectedChange, onClear]);

  const showClear = hasSelections && !open;

  return (
    <div className={`space-y-1 ${className}`} ref={containerRef}>
      {inputLabel && (
        <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
          {inputLabel}
        </label>
      )}
      <div className="relative">
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
            placeholder={defaultPlaceholder}
            onFocus={handleFocus}
            onClick={handleClick}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={`w-full rounded-card bg-surface-container border px-3 py-2.5 pl-9 pr-8 text-sm outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer min-w-[200px] min-h-[36px] ${
              hasSelections
                ? "text-on-surface border-primary/30"
                : "text-on-surface-variant border-outline"
            } placeholder:text-on-surface-variant`}
          />

          {/* Clear button */}
          {showClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
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

          {/* Sublabel for single mode */}
          {!isMulti && displaySublabel && !open && !showClear && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant">
              {displaySublabel}
            </span>
          )}
        </div>

        {/* Dropdown -- Fix 1: NO secondary search input inside dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 w-full min-w-[240px] max-h-72 bg-surface-container border border-outline rounded-card shadow-2xl shadow-black/30 flex flex-col overflow-hidden">
            {/* Count header */}
            <div className="sticky top-0 bg-surface-container px-3 py-1.5 border-b border-outline">
              <span className="text-[10px] text-on-surface-variant">
                {hasSelections
                  ? `${isMulti ? selected.length : 1} selected of ${available.length}`
                  : `${filtered.length} ${label.toLowerCase()}`}
              </span>
            </div>

            {/* Scrollable list -- scroll position preserved on item toggle */}
            <div ref={listRef} className="overflow-y-auto flex-1">
              {filtered.map((o, idx) => {
                const isItemSelected = isMulti
                  ? selectedSet.has(o.value)
                  : o.value === selectedId;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={o.value}
                    type="button"
                    data-dropdown-item
                    onClick={() => handleItemClick(o.value)}
                    className={`w-full text-left px-3 py-2.5 text-xs hover:bg-surface-bright flex items-center gap-2 min-h-[36px] transition-colors border-l-2 ${
                      isItemSelected
                        ? "bg-surface-bright border-l-primary"
                        : "border-l-transparent"
                    } ${isHighlighted && !isItemSelected ? "bg-surface-bright" : ""}`}
                  >
                    {/* Checkbox: orange for multi-select filtering */}
                    {isMulti && (
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isItemSelected
                            ? "bg-primary border-primary text-surface"
                            : "border-on-surface-variant/40"
                        }`}
                      >
                        {isItemSelected && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
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
                    )}

                    {/* Active indicator for single mode */}
                    {!isMulti && isItemSelected && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}

                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {o.logo && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={o.logo}
                          alt=""
                          className="w-5 h-5 rounded-full bg-on-surface/10 p-[2px] shrink-0"
                        />
                      )}
                      {/* Fix 3: Bracket name (label) is PRIMARY, full name (sublabel) is secondary */}
                      <div className="min-w-0">
                        <div className="text-on-surface truncate">
                          {highlightMatch(o.label, query)}
                        </div>
                        {o.sublabel && o.sublabel !== o.label && (
                          <div className="text-[10px] text-on-surface-variant truncate">
                            {highlightMatch(o.sublabel, query)}
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

            {/* Clear footer */}
            {isMulti && selected.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectedChange?.([])}
                className="px-3 py-2 text-[10px] font-label text-on-surface-variant hover:text-on-surface border-t border-outline transition-colors"
              >
                Clear all
              </button>
            )}
            {!isMulti && selectedId && onClear && (
              <button
                type="button"
                onClick={() => { onClear(); setOpen(false); setQuery(""); }}
                className="w-full px-3 py-2 text-[10px] font-label text-on-surface-variant hover:text-on-surface border-t border-outline transition-colors text-left"
              >
                Clear selection
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const MultiSelectSearch = React.memo(MultiSelectSearchInner);
export default MultiSelectSearch;
