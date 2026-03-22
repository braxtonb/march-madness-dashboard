"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { AwardCard } from "@/components/ui/AwardCard";
import type { Round } from "@/lib/types";
import { ROUND_ORDER } from "@/lib/constants";

export interface Award {
  title: string;
  winner: string;
  bracketName: string;
  stat: string;
  tier: "gold" | "silver" | "bronze";
  championName?: string;
  championLogo?: string;
  championSeed?: number;
  championEliminated?: boolean;
}

interface AwardsClientProps {
  awardsByRound: Record<string, Award[]>;
  completedRounds: Round[];
  currentRound: Round;
}

export function AwardsClient({ awardsByRound, completedRounds, currentRound }: AwardsClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paramRound = searchParams.get("round") as Round | null;
  const [selectedRound, setSelectedRound] = useState<Round>(
    paramRound && ROUND_ORDER.includes(paramRound) ? paramRound : currentRound
  );

  function changeRound(round: Round) {
    setSelectedRound(round);
    const params = new URLSearchParams(searchParams.toString());
    params.set("round", round);
    router.replace(`/awards?${params.toString()}`, { scroll: false });
  }

  const awards = awardsByRound[selectedRound] ?? [];

  return (
    <>
      <RoundSelector selected={selectedRound} onSelect={changeRound} />

      {completedRounds.length === 0 && (
        <div className="rounded-card bg-surface-container p-8 text-center">
          <p className="text-on-surface-variant">No completed rounds yet. Awards will appear after the first round finishes.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {awards.map((award) => (
          <AwardCard key={award.title} {...award} />
        ))}
      </div>
    </>
  );
}
