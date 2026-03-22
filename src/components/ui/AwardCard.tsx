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
      <circle cx="12" cy="14" r="7" fill="#00f4fe" fillOpacity="0.1" />
      <circle cx="12" cy="14" r="3" fill="#00f4fe" fillOpacity="0.3" />
      <path d="M12 7v-2" /><path d="M8 8l-1-1" /><path d="M16 8l1-1" />
      <path d="M7 21h10" /><path d="M9 21v-2a3 3 0 0 1 6 0v2" />
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
      <path d="M12 11l-1.5 1.5L12 14l1.5-1.5z" fill="#c97cff" />
    </svg>
  ),
  "The Contrarian": (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff8c42" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#ff8c42" fillOpacity="0.2" />
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
                  <span className="inline-flex items-center gap-1"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg> Champion</span>: <TeamPill name={firstWinner.championPick} seed={firstWinner.championSeed} logo={teamLogos[firstWinner.championPick]} eliminated={firstWinner.championEliminated} showStatus />
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
