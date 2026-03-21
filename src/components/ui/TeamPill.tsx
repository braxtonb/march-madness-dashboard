export function TeamPill({
  name,
  seed,
  eliminated = false,
}: {
  name: string;
  seed?: number;
  eliminated?: boolean;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full bg-surface-bright
        px-2.5 py-1 text-xs font-label
        ${eliminated ? "eliminated" : "text-on-surface"}
      `}
    >
      {seed != null && (
        <span className="text-on-surface-variant">{seed}</span>
      )}
      <span>{name}</span>
    </span>
  );
}
