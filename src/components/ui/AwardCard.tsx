/* eslint-disable @next/next/no-img-element */

const AWARD_DESCRIPTIONS: Record<string, string> = {
  "The Oracle": "Most correct picks this round — seeing the future clearly",
  "The Trendsetter": "Most unique correct picks — called winners nobody else had",
  "The Faithful": "Highest scorer whose champion is still alive — loyalty rewarded",
  "Hot Streak": "Most consecutive correct picks — on a roll",
  "Momentum Builder": "Biggest rank climb this round — surging up the standings",
  "The People's Champion": "Most aligned with group consensus — the voice of the people",
};

const AWARD_ICONS: Record<string, string> = {
  "The Oracle": "🔮",
  "The Trendsetter": "🌟",
  "The Faithful": "🛡️",
  "Hot Streak": "🔥",
  "Momentum Builder": "🚀",
  "The People's Champion": "👑",
};

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
  const tierFallback = { gold: "🥇", silver: "🥈", bronze: "🥉" };
  const icon = AWARD_ICONS[title] || tierFallback[tier];
  const description = AWARD_DESCRIPTIONS[title] || "";
  const isAwaiting = winner === "No winner yet" || !winner;

  return (
    <div className="rounded-card bg-surface-container p-5 space-y-3 hover:bg-surface-bright transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div>
          <h4 className={`font-display font-semibold ${tierColors[tier]}`}>
            {title}
          </h4>
          <p className="text-[10px] text-on-surface-variant">{description}</p>
        </div>
      </div>

      {isAwaiting ? (
        <p className="text-sm text-on-surface-variant italic">Awaiting results</p>
      ) : (
        <>
          <div>
            <p className="font-body text-on-surface font-medium">{winner}</p>
            <p className="text-xs text-on-surface-variant">{bracketName}</p>
          </div>
          <p className="text-sm text-on-surface-variant">{stat}</p>
          {championName && (
            <p className="text-xs text-on-surface-variant flex items-center gap-1">
              Champion: {championLogo && <img src={championLogo} alt="" className="w-4 h-4 inline-block rounded-full bg-on-surface/10 p-[1px]" />}
              <span className="text-on-surface font-medium">{championName}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
