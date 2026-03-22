/* eslint-disable @next/next/no-img-element */

import { TeamPill } from "@/components/ui/TeamPill";
import type { Award } from "@/lib/types";

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
  award,
  onClick,
}: {
  award: Award;
  onClick?: () => void;
}) {
  const tierColors = {
    gold: "text-achievement",
    silver: "text-on-surface-variant",
    bronze: "text-action",
  };
  const tierFallback = {
    gold: String.fromCodePoint(0x1F947),
    silver: String.fromCodePoint(0x1F948),
    bronze: String.fromCodePoint(0x1F949),
  };

  const icon = AWARD_ICONS[award.title] || tierFallback[award.tier];
  const description = AWARD_DESCRIPTIONS[award.title] || award.description;
  const hasWinners = award.winners.length > 0;
  const isTie = award.winners.length > 1;
  const firstWinner = award.winners[0];

  return (
    <div
      className={`rounded-card bg-surface-container p-5 space-y-3 transition-colors ${
        hasWinners && onClick ? "hover:bg-surface-bright cursor-pointer group" : "hover:bg-surface-bright"
      }`}
      onClick={hasWinners ? onClick : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-display font-semibold ${tierColors[award.tier]}`}>
              {award.title}
            </h4>
            {isTie && (
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-label whitespace-nowrap">
                {award.winners.length}-way tie
              </span>
            )}
          </div>
          <p className="text-[10px] text-on-surface-variant">{description}</p>
        </div>
      </div>

      {!hasWinners ? (
        <p className="text-sm text-on-surface-variant italic">
          {award.description.startsWith("No winner") ? award.description : "No winner yet"}
        </p>
      ) : isTie ? (
        <>
          {/* Tied winners: show compact label only */}
          <p className="text-sm text-on-surface-variant">
            {award.winners.length} brackets tied &mdash; {firstWinner.stat}
          </p>

          {/* Click hint */}
          {onClick && (
            <p className="text-[10px] text-on-surface-variant/50 opacity-0 group-hover:opacity-100 transition-opacity">
              Click for details &rarr;
            </p>
          )}
        </>
      ) : (
        <>
          {/* Single winner */}
          <div>
            <p className="font-body text-on-surface font-medium">{firstWinner.name}</p>
            <p className="text-xs text-on-surface-variant">{firstWinner.bracketName}</p>
          </div>
          <p className="text-sm text-on-surface-variant">{firstWinner.stat}</p>
          {firstWinner.championPick && (
            <p className="text-xs text-on-surface-variant flex items-center gap-1">
              Champion: <TeamPill name={firstWinner.championPick} seed={firstWinner.championSeed} eliminated={firstWinner.championEliminated} showStatus />
            </p>
          )}

          {/* Click hint */}
          {onClick && (
            <p className="text-[10px] text-on-surface-variant/50 opacity-0 group-hover:opacity-100 transition-opacity">
              Click for details &rarr;
            </p>
          )}
        </>
      )}
    </div>
  );
}
