"use client";

import { useState } from "react";
import { RoundSelector } from "@/components/ui/RoundSelector";
import { AwardCard } from "@/components/ui/AwardCard";
import type { Round } from "@/lib/types";

export interface Award {
  title: string;
  winner: string;
  bracketName: string;
  stat: string;
  tier: "gold" | "silver" | "bronze";
}

interface AwardsClientProps {
  awardsByRound: Record<string, Award[]>;
  completedRounds: Round[];
  currentRound: Round;
}

export function AwardsClient({ awardsByRound, completedRounds, currentRound }: AwardsClientProps) {
  const [selectedRound, setSelectedRound] = useState<Round>(currentRound);

  const awards = awardsByRound[selectedRound] ?? [];

  return (
    <>
      <RoundSelector selected={selectedRound} onSelect={setSelectedRound} />

      {completedRounds.length === 0 && (
        <div className="rounded-card bg-surface-container p-8 text-center">
          <p className="text-on-surface-variant">No completed rounds yet. Awards will appear after the first round finishes.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {awards.map((award) => (
          <AwardCard key={award.title} {...award} />
        ))}
      </div>
    </>
  );
}
