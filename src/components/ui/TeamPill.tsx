/* eslint-disable @next/next/no-img-element */
export function TeamPill({
  name,
  seed,
  eliminated = false,
  logo,
  showStatus = false,
}: {
  name: string;
  seed?: number;
  eliminated?: boolean;
  logo?: string;
  /** Show alive/eliminated indicator inside the pill */
  showStatus?: boolean;
}) {
  if (!name) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-bright px-2.5 py-1 text-xs font-label text-on-surface-variant/50 italic">
        N/A
      </span>
    );
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full bg-surface-bright
        px-2.5 py-1 text-xs font-label
        ${eliminated ? "eliminated" : "text-on-surface"}
      `}
    >
      {logo && (
        <img
          src={logo}
          alt=""
          width={20}
          height={20}
          className="inline-block rounded-full bg-on-surface/10 p-[2px]"
          style={{ filter: "drop-shadow(0 0 1px rgba(255,255,255,0.3))" }}
        />
      )}
      {seed != null && seed > 0 && (
        <span className="text-on-surface-variant">{seed}</span>
      )}
      <span>{name}</span>
      {showStatus && !eliminated && (
        <span className="inline-block h-2 w-2 rounded-full bg-secondary shrink-0" title="Still alive" />
      )}
      {showStatus && eliminated && (
        <span className="inline-block h-2 w-2 rounded-full bg-on-surface-variant/30 shrink-0" title="Eliminated" />
      )}
    </span>
  );
}
