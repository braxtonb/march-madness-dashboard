"use client";

import { useState, useEffect } from "react";

const BASKETBALL_FACTS = [
  "The first March Madness tournament was held in 1939 with just 8 teams.",
  "A 16-seed has only beaten a 1-seed twice in tournament history.",
  "The most common Final Four seed is a 1-seed, appearing over 60% of the time.",
  "Villanova's 2018 championship team shot 67.3% in the title game — a record.",
  "The term 'March Madness' was first used for high school basketball in 1939.",
  "Duke and North Carolina are the only teams to have 5+ championships.",
  "The biggest upset by seed differential was a 15-seed beating a 2-seed.",
  "No team has ever gone 6-0 in the tournament with all games decided by 1 point.",
  "The tournament expanded to 64 teams in 1985, creating the bracket we know today.",
  "Loyola Chicago's Sister Jean became a celebrity at age 98 during the 2018 tournament.",
];

export function MaintenanceFallback() {
  const [factIndex, setFactIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const factTimer = setInterval(() => {
      setFactIndex((i) => (i + 1) % BASKETBALL_FACTS.length);
    }, 6000);
    const dotTimer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => {
      clearInterval(factTimer);
      clearInterval(dotTimer);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      {/* Bouncing basketball */}
      <div className="text-6xl mb-6 animate-bounce">🏀</div>

      <h2 className="font-display text-2xl font-bold text-on-surface mb-2">
        Warming up{dots}
      </h2>

      <p className="text-on-surface-variant max-w-md mb-8">
        We&apos;re getting the latest bracket data ready. This usually takes less than a minute.
        Check back shortly!
      </p>

      {/* Fun fact card */}
      <div className="rounded-card bg-surface-container border border-outline-variant/20 px-6 py-4 max-w-lg">
        <p className="text-[10px] font-label uppercase tracking-wider text-primary mb-2">
          Did you know?
        </p>
        <p className="text-sm text-on-surface-variant transition-opacity duration-500">
          {BASKETBALL_FACTS[factIndex]}
        </p>
      </div>

      {/* Refresh hint */}
      <button
        onClick={() => window.location.reload()}
        className="mt-8 text-xs text-on-surface-variant/60 hover:text-secondary transition-colors font-label"
      >
        Refresh page
      </button>
    </div>
  );
}
