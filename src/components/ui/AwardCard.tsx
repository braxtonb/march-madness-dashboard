/* eslint-disable @next/next/no-img-element */
export function AwardCard({
  title,
  winner,
  bracketName,
  stat,
  tier,
  championName,
  championLogo,
}: {
  title: string;
  winner: string;
  bracketName: string;
  stat: string;
  tier: "gold" | "silver" | "bronze";
  championName?: string;
  championLogo?: string;
}) {
  const tierColors = {
    gold: "text-achievement",
    silver: "text-on-surface-variant",
    bronze: "text-action",
  };
  const tierIcons = { gold: "\uD83C\uDFC6", silver: "\uD83E\uDD48", bronze: "\uD83E\uDD49" };

  return (
    <div className="rounded-card bg-surface-container p-5 space-y-3 hover:bg-surface-bright transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{tierIcons[tier]}</span>
        <h4 className={`font-display font-semibold ${tierColors[tier]}`}>
          {title}
        </h4>
      </div>
      <div>
        <p className="font-body text-on-surface font-medium">{winner}</p>
        <p className="text-xs text-on-surface-variant">{bracketName}</p>
      </div>

      <p className="text-sm text-on-surface-variant">{stat}</p>
      {championName && (
        <p className="text-xs text-on-surface-variant flex items-center gap-1">
          Champion: {championLogo && <img src={championLogo} alt="" className="w-4 h-4 inline-block rounded-sm" />}
          <span className="text-on-surface font-medium">{championName}</span>
        </p>
      )}
    </div>
  );
}
