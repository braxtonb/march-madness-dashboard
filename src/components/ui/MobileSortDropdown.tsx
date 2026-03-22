"use client";

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
  return (
    <div className="sm:hidden mb-3">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container border border-outline-variant rounded-lg px-3 py-2.5 text-on-surface text-sm min-h-[44px]"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
