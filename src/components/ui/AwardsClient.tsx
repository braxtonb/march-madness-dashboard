"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { AwardCard } from "@/components/ui/AwardCard";
import AwardDetailSidebar from "@/components/ui/AwardDetailSidebar";
import type { Award, Round, Bracket, Pick, Game, Team } from "@/lib/types";
import { ROUND_ORDER, AWARD_ROUND_LABELS } from "@/lib/constants";

interface AwardsClientProps {
  awardsByRound: Record<string, Award[]>;
  completedRounds: Round[];
  currentRound: Round;
  picks: Pick[];
  games: Game[];
  teams: Team[];
  brackets: Bracket[];
  pickRates: Record<string, Record<string, number>>;
}

export function AwardsClient({
  awardsByRound,
  completedRounds,
  currentRound,
  picks,
  games,
  teams,
  brackets,
  pickRates,
}: AwardsClientProps) {
  const searchParams = useSearchParams();
  const validRounds = [...ROUND_ORDER, "ALL"];
  const paramRound = searchParams.get("round");
  const [selectedRound, setSelectedRound] = useState<string>(
    paramRound && validRounds.includes(paramRound) ? paramRound : "ALL"
  );
  const [selectedAwardIdx, setSelectedAwardIdx] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const awardParam = params.get("award");
    if (awardParam != null) {
      const idx = Number(awardParam);
      if (!isNaN(idx) && idx >= 0) return idx;
    }
    return null;
  });

  // Update URL when award sidebar opens/closes
  function setAwardWithUrl(idx: number | null) {
    setSelectedAwardIdx(idx);
    const url = new URL(window.location.href);
    if (idx != null) {
      url.searchParams.set("award", String(idx));
    } else {
      url.searchParams.delete("award");
    }
    window.history.replaceState(null, "", url.toString());
  }

  // Build team logo lookup for AwardCard
  const teamLogos: Record<string, string> = useMemo(() => {
    return Object.fromEntries(teams.map((t) => [t.name, t.logo]));
  }, [teams]);

  function changeRound(round: string) {
    setSelectedRound(round);
    const params = new URLSearchParams(window.location.search);
    params.set("round", round);
    window.history.replaceState(null, "", `/awards?${params.toString()}`);
  }

  const awards = awardsByRound[selectedRound] ?? [];
  const roundLabel = AWARD_ROUND_LABELS[selectedRound] || selectedRound;

  return (
    <>
      <RoundSelector
        selected={selectedRound}
        onSelect={changeRound}
        extraOptions={[{ value: "ALL", label: "All Rounds" }]}
      />

      {completedRounds.length === 0 && (
        <div className="rounded-card bg-surface-container p-8 text-center">
          <p className="text-on-surface-variant">No completed rounds yet. Awards will appear after the first round finishes.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {awards.map((award, idx) => (
          <AwardCard
            key={award.title}
            award={award}
            onClick={() => setAwardWithUrl(idx)}
            teamLogos={teamLogos}
            roundLabel={roundLabel}
          />
        ))}
      </div>

      {selectedAwardIdx !== null && awards[selectedAwardIdx] && (
        <AwardDetailSidebar
          awards={awards}
          selectedIndex={selectedAwardIdx}
          onChangeIndex={setAwardWithUrl}
          open={true}
          onClose={() => setAwardWithUrl(null)}
          picks={picks}
          games={games}
          teams={teams}
          brackets={brackets}
          pickRates={pickRates}
          selectedRound={selectedRound}
        />
      )}
    </>
  );
}
