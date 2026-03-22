/* eslint-disable @next/next/no-img-element */

import { TeamPill } from "@/components/ui/TeamPill";
import type { Award } from "@/lib/types";

function getAwardDescription(title: string, roundLabel?: string): string {
  const scope = roundLabel || "this round";
  const descriptions: Record<string, string> = {
    "The Oracle": `Most correct picks — ${scope}`,
    "The Trendsetter": `Most unique correct picks — ${scope}`,
    "The Faithful": `Highest scorer whose champion is still alive — ${scope}`,
    "Hot Streak": `Most consecutive correct picks — ${scope}`,
    "Diamond in the Rough": `Single best pick almost nobody else made — ${scope}`,
    "The People's Champion": `Most aligned with group consensus — ${scope}`,
  };
  return descriptions[title] || "";
}

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
  teamLogos = {},
  roundLabel,
}: {
  award: Award;
  onClick?: () => void;
  teamLogos?: Record<string, string>;
  roundLabel?: string;
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
  const description = getAwardDescription(award.title, roundLabel) || award.description;
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
            {award.winners.length}-way tie &mdash; {firstWinner.stat}
          </p>

          {/* Click hint */}
          {onClick && (
            <p className="text-[10px] text-on-surface-variant/50 opacity-0 group-hover:opacity-100 transition-opacity">
              Click for details <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path d="M18 12H6" /><path d="m18 12-4-4" /><path d="m18 12-4 4" /></svg>
            </p>
          )}
        </>
      ) : (
        <>
          {/* Single winner */}
          <div>
            <p className="font-body text-on-surface font-semibold">{firstWinner.name}</p>
            {firstWinner.fullName && firstWinner.fullName !== firstWinner.name && (
              <p className="text-xs text-on-surface-variant">{firstWinner.fullName}</p>
            )}
          </div>
          <p className="text-sm text-on-surface-variant">{firstWinner.stat}</p>
          {firstWinner.championPick && (
            <p className="text-xs text-on-surface-variant flex items-center gap-1">
              Champion: <TeamPill name={firstWinner.championPick} seed={firstWinner.championSeed} logo={teamLogos[firstWinner.championPick]} eliminated={firstWinner.championEliminated} showStatus />
            </p>
          )}

          {/* Click hint */}
          {onClick && (
            <p className="text-[10px] text-on-surface-variant/50 opacity-0 group-hover:opacity-100 transition-opacity">
              Click for details <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline-block"><path d="M18 12H6" /><path d="m18 12-4-4" /><path d="m18 12-4 4" /></svg>
            </p>
          )}
        </>
      )}
    </div>
  );
}
