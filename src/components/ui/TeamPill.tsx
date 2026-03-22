/* eslint-disable @next/next/no-img-element */
export function TeamPill({
  name,
  seed,
  eliminated = false,
  logo,
}: {
  name: string;
  seed?: number;
  eliminated?: boolean;
  logo?: string;
}) {
  // Empty/unsubmitted bracket — show N/A
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
          width={16}
          height={16}
          className="inline-block rounded-sm bg-white/90 p-[1px]"
        />
      )}
      {seed != null && seed > 0 && (
        <span className="text-on-surface-variant">{seed}</span>
      )}
      <span>{name}</span>
    </span>
  );
}
