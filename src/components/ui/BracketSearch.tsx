"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { displayName } from "@/lib/constants";
import type { Bracket } from "@/lib/types";

interface BracketSearchProps {
  brackets: Bracket[];
  mode: "filter" | "select" | "filter-multi";
  // Filter mode
  value?: string;
  onChange?: (query: string) => void;
  // Select mode
  selectedId?: string;
  onSelect?: (id: string) => void;
  onClear?: () => void;
  // Filter-multi mode
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  // Shared
  placeholder?: string;
  className?: string;
  excludeId?: string;
  label?: string;
}

function highlightMatch(text: string, query: string) {
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

export default function BracketSearch({
  brackets,
  mode,
  value = "",
  onChange,
  selectedId,
  onSelect,
  onClear,
  selectedIds = [],
  onSelectedIdsChange,
  placeholder = "Search brackets...",
  className = "",
  excludeId,
  label,
}: BracketSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = mode === "select" ? brackets.find((b) => b.id === selectedId) : null;

  // For filter-multi mode: resolve selected brackets
  const selectedMultiBrackets = useMemo(() => {
    if (mode !== "filter-multi") return [];
    const idSet = new Set(selectedIds);
    return brackets.filter((b) => idSet.has(b.id));
  }, [mode, brackets, selectedIds]);

  // In filter mode, keep query synced with external value
  useEffect(() => {
    if (mode === "filter") {
      setQuery(value);
    }
  }, [mode, value]);

  // Available brackets (excluding the other side's selection in H2H)
  const available = useMemo(() => {
    return excludeId ? brackets.filter((b) => b.id !== excludeId) : brackets;
  }, [brackets, excludeId]);

  // Filter brackets based on query
  const filtered = useMemo(() => {
    if (!query) return available;
    const q = query.toLowerCase();
    return available.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.owner.toLowerCase().includes(q) ||
        (b.full_name || "").toLowerCase().includes(q)
    );
  }, [available, query]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Compute the display value for the input
  const inputValue = (() => {
    if (mode === "select") {
      if (open) return query;
      if (selected) return displayName(selected);
      return "";
    }
    if (mode === "filter-multi") {
      if (open) return query;
      if (selectedMultiBrackets.length === 0) return "";
      if (selectedMultiBrackets.length === 1) return displayName(selectedMultiBrackets[0]);
      return `${displayName(selectedMultiBrackets[0])} +${selectedMultiBrackets.length - 1} more`;
    }
    // filter mode
    return query;
  })();

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (!open) setOpen(true);
      if (mode === "filter" && onChange) {
        onChange(val);
      }
    },
    [mode, onChange, open]
  );

  const handleFocus = useCallback(() => {
    setOpen(true);
    if (mode === "select" || mode === "filter-multi") {
      setQuery("");
    }
  }, [mode]);

  const handleSelect = useCallback(
    (b: Bracket) => {
      if (mode === "select") {
        onSelect?.(b.id);
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      } else if (mode === "filter-multi") {
        // Toggle: add or remove from selected set
        const isAlreadySelected = selectedIds.includes(b.id);
        if (isAlreadySelected) {
          onSelectedIdsChange?.(selectedIds.filter((id) => id !== b.id));
        } else {
          onSelectedIdsChange?.([...selectedIds, b.id]);
        }
        // Keep dropdown open, clear query for next search
        setQuery("");
        inputRef.current?.focus();
      } else {
        // filter mode: fill the input with the bracket's display name
        const name = displayName(b);
        setQuery(name);
        onChange?.(name);
        setOpen(false);
        inputRef.current?.blur();
      }
    },
    [mode, onSelect, onChange, selectedIds, onSelectedIdsChange]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    if (mode === "select") {
      onClear?.();
    } else if (mode === "filter-multi") {
      onSelectedIdsChange?.([]);
    } else {
      onChange?.("");
    }
    inputRef.current?.focus();
  }, [mode, onClear, onChange, onSelectedIdsChange]);

  const showClear =
    (mode === "select" && selected && !open) ||
    (mode === "filter" && query.length > 0) ||
    (mode === "filter-multi" && selectedIds.length > 0 && !open);

  return (
    <div className={`space-y-1 ${className}`} ref={containerRef}>
      {label && (
        <label className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
          {label}
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
            value={inputValue}
            placeholder={placeholder}
            onFocus={handleFocus}
            onChange={handleInputChange}
            className="w-full rounded-card bg-surface-container border border-outline px-3 py-2.5 pl-9 pr-8 text-sm text-on-surface outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant"
          />

          {/* Clear button */}
          {showClear && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-on-surface transition-colors"
              aria-label="Clear search"
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

          {/* Secondary label for select mode when a bracket is selected */}
          {mode === "select" &&
            selected &&
            !open &&
            !showClear &&
            (() => {
              const primary = displayName(selected);
              return selected.name !== primary ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant">
                  {selected.name}
                </span>
              ) : null;
            })()}
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-card bg-surface-container border border-outline shadow-2xl shadow-black/30">
            {/* Selected pills for filter-multi mode */}
            {mode === "filter-multi" && selectedMultiBrackets.length > 0 && (
              <div className="sticky top-0 bg-surface-container px-3 py-2 border-b border-outline z-10 flex flex-wrap gap-1">
                {selectedMultiBrackets.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-label"
                  >
                    {displayName(b)}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectedIdsChange?.(selectedIds.filter((id) => id !== b.id));
                      }}
                      className="hover:text-primary/70 transition-colors"
                    >
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className={`sticky ${mode === "filter-multi" && selectedMultiBrackets.length > 0 ? "" : "top-0"} bg-surface-container px-3 py-1.5 border-b border-outline`}>
              <span className="text-[10px] text-on-surface-variant">
                {filtered.length} bracket{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-xs text-on-surface-variant text-center">
                No matches found
              </div>
            )}
            {filtered.map((b) => {
              const primary = displayName(b);
              const isActive = mode === "select" && b.id === selectedId;
              const isMultiSelected = mode === "filter-multi" && selectedIds.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleSelect(b)}
                  className={`w-full text-left px-3 py-2.5 hover:bg-surface-bright transition-colors border-l-2 ${
                    isActive || isMultiSelected
                      ? "bg-surface-bright border-l-primary"
                      : "border-l-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {mode === "filter-multi" && (
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        isMultiSelected
                          ? "bg-primary border-primary"
                          : "border-on-surface-variant/40"
                      }`}>
                        {isMultiSelected && (
                          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                            <path d="M3 8L6.5 11.5L13 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    )}
                    <div>
                      <div className="text-sm font-medium text-on-surface">
                        {highlightMatch(primary, query)}
                      </div>
                      {b.name !== primary && (
                        <div className="text-[10px] text-on-surface-variant">
                          {highlightMatch(b.name, query)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
