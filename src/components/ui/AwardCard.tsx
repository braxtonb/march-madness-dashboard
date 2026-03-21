export function AwardCard({
  title,
  winner,
  bracketName,
  stat,
  tier,
}: {
  title: string;
  winner: string;
  bracketName: string;
  stat: string;
  tier: "gold" | "silver" | "bronze";
}) {
  const tierColors = {
    gold: "text-achievement",
    silver: "text-on-surface-variant",
    bronze: "text-action",
  };
  const tierIcons = { gold: "🏆", silver: "🥈", bronze: "🥉" };

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
    </div>
  );
}
