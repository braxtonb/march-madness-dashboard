"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { AwardCard } from "@/components/ui/AwardCard";
import type { Award, Round, Bracket, Pick, Game, Team } from "@/lib/types";
import { ROUND_ORDER } from "@/lib/constants";

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
  const router = useRouter();
  const validRounds = [...ROUND_ORDER, "ALL"];
  const paramRound = searchParams.get("round");
  const [selectedRound, setSelectedRound] = useState<string>(
    paramRound && validRounds.includes(paramRound) ? paramRound : currentRound
  );
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);

  function changeRound(round: string) {
    setSelectedRound(round);
    const params = new URLSearchParams(searchParams.toString());
    params.set("round", round);
    router.replace(`/awards?${params.toString()}`, { scroll: false });
  }

  const awards = awardsByRound[selectedRound] ?? [];

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
        {awards.map((award) => (
          <AwardCard
            key={award.title}
            award={award}
            onClick={() => setSelectedAward(award)}
          />
        ))}
      </div>
    </>
  );
}
