/* eslint-disable @next/next/no-img-element */

import { TeamPill } from "@/components/ui/TeamPill";

const AWARD_DESCRIPTIONS: Record<string, string> = {
  "The Oracle": "Most correct picks this round — seeing the future clearly",
  "The Trendsetter": "Most unique correct picks — called winners nobody else had",
  "The Faithful": "Highest scorer whose champion is still alive — loyalty rewarded",
  "Hot Streak": "Most consecutive correct picks — on a roll",
  "Diamond in the Rough": "Single best pick almost nobody else made — hidden gem",
  "The People's Champion": "Most aligned with group consensus — the voice of the people",
};

const AWARD_ICONS: Record<string, string> = {
  "The Oracle": String.fromCodePoint(0x1F52E),
  "The Trendsetter": String.fromCodePoint(0x1F31F),
  "The Faithful": String.fromCodePoint(0x1F6E1, 0xFE0F),
  "Hot Streak": String.fromCodePoint(0x1F525),
  "Diamond in the Rough": String.fromCodePoint(0x1F48E),
  "The People's Champion": String.fromCodePoint(0x1F451),
};

export function AwardCard({
  title,
  winner,
  bracketName,
  stat,
  tier,
  championName,
  championLogo,
  championSeed,
  championEliminated,
}: {
  title: string;
  winner: string;
  bracketName: string;
  stat: string;
  tier: "gold" | "silver" | "bronze";
  championName?: string;
  championLogo?: string;
  championSeed?: number;
  championEliminated?: boolean;
}) {
  const tierColors = {
    gold: "text-achievement",
    silver: "text-on-surface-variant",
    bronze: "text-action",
  };
  const tierFallback = { gold: String.fromCodePoint(0x1F947), silver: String.fromCodePoint(0x1F948), bronze: String.fromCodePoint(0x1F949) };
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
              Champion: <TeamPill name={championName} seed={championSeed} logo={championLogo} eliminated={championEliminated} showStatus />
            </p>
          )}
        </>
      )}
    </div>
  );
}
