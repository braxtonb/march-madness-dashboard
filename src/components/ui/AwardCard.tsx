/* eslint-disable @next/next/no-img-element */

import type { ReactNode } from "react";
import { TeamPill } from "@/components/ui/TeamPill";
import type { Award } from "@/lib/types";

function getAwardDescription(title: string, roundLabel?: string): string {
  const scope = roundLabel || "this round";
  const descriptions: Record<string, string> = {
    "The Oracle": `Most correct picks — ${scope}`,
    "The Trendsetter": `Most unique correct picks — ${scope}`,
    "The Faithful": `Highest scorer whose champion is still alive — ${scope}`,
    "The Contrarian": `Most correct picks against national consensus — ${scope}`,
    "Diamond in the Rough": `Single best pick almost nobody else made — ${scope}`,
    "The People's Champion": `Most aligned with group consensus — ${scope}`,
  };
  return descriptions[title] || "";
}

const AWARD_ICONS: Record<string, ReactNode> = {
  "The Oracle": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f4fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="#00f4fe" fillOpacity="0.08" />
      <circle cx="12" cy="12" r="3.5" fill="#00f4fe" fillOpacity="0.25" />
      <circle cx="12" cy="12" r="1.5" fill="#00f4fe" fillOpacity="0.5" />
    </svg>
  ),
  "The Trendsetter": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff8c42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6z" fill="#ff8c42" fillOpacity="0.2" />
    </svg>
  ),
  "The Faithful": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c97cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#c97cff" fillOpacity="0.15" />
    </svg>
  ),
  "The Contrarian": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff8c42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" /><path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" fill="#ff8c42" fillOpacity="0.15" />
    </svg>
  ),
  "Diamond in the Rough": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00f4fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12l4 7-10 11L2 10z" fill="#00f4fe" fillOpacity="0.15" />
      <path d="M2 10h20" /><path d="M12 21L6 3" /><path d="M12 21l6-18" />
    </svg>
  ),
  "The People's Champion": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c97cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 20h20" />
      <path d="M4 17l2-12 4 5 2-7 2 7 4-5 2 12z" fill="#c97cff" fillOpacity="0.2" />
    </svg>
  ),
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

  const icon = AWARD_ICONS[award.title] || null;
  const description = getAwardDescription(award.title, roundLabel) || award.description;
  const hasWinners = award.winners.length > 0;
  const isTie = award.winners.length > 1;
  const firstWinner = award.winners[0];

  return (
    <div
      className={`rounded-card bg-surface-container border border-outline-variant p-4 flex flex-col h-full transition-colors ${
        hasWinners && onClick ? "hover:bg-surface-bright cursor-pointer group" : "hover:bg-surface-bright"
      }`}
      onClick={hasWinners ? onClick : undefined}
    >
      {/* Card content */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="shrink-0">{icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`font-display font-semibold ${tierColors[award.tier]}`}>
                {award.title}
              </h4>
            </div>
            <p className="text-[10px] text-on-surface-variant">{description}</p>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          {!hasWinners ? (
            <p className="text-sm text-on-surface-variant italic">
              {award.description.startsWith("No winner") ? award.description : "No winner yet"}
            </p>
          ) : isTie ? (
            <p className="text-sm text-on-surface-variant">
              {award.winners.length}-way tie &mdash; {firstWinner.stat}
            </p>
          ) : (
            <>
              {/* Single winner */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-body text-on-surface font-semibold">{firstWinner.name}</p>
                  {firstWinner.fullName && firstWinner.fullName !== firstWinner.name && (
                    <p className="text-xs text-on-surface-variant">{firstWinner.fullName}</p>
                  )}
                </div>
              </div>
              <p className="text-sm text-on-surface-variant">{firstWinner.stat}</p>
              {firstWinner.championPick && award.title !== "The Contrarian" && award.title !== "Diamond in the Rough" && (
                <p className="text-xs text-on-surface-variant flex items-center gap-1">
                  Champion: <TeamPill name={firstWinner.championPick} seed={firstWinner.championSeed} logo={teamLogos[firstWinner.championPick]} eliminated={firstWinner.championEliminated} showStatus />
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer — always at bottom */}
      {onClick && hasWinners && (
        <div className="mt-3 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">
          <span>Show details</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M15 3v18" />
          </svg>
        </div>
      )}
    </div>
  );
}
