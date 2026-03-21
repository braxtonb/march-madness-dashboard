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
          className="inline-block rounded-sm"
        />
      )}
      {seed != null && (
        <span className="text-on-surface-variant">{seed}</span>
      )}
      <span>{name}</span>
    </span>
  );
}
