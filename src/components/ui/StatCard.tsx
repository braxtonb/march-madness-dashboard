export function StatCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-card bg-surface-container p-5 flex flex-col gap-1">
      <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span className="font-display text-2xl font-bold text-on-surface">
        {value}
      </span>
      {subtitle && (
        <span className="text-sm text-on-surface-variant">{subtitle}</span>
      )}
    </div>
  );
}
