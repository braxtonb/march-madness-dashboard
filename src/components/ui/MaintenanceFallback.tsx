"use client";

import { useState, useEffect } from "react";

const BASKETBALL_FACTS = [
  "The first NCAA tournament was held in 1939 with just 8 teams. Oregon won the inaugural championship.",
  "UMBC became the first 16-seed to beat a 1-seed in 2018, defeating Virginia 74–54.",
  "UCLA holds the record with 11 national championships, including 7 straight from 1967–1973.",
  "The term 'March Madness' was coined by Illinois high school official Henry V. Porter in 1939.",
  "Christian Laettner's buzzer-beater against Kentucky in 1992 is often called the greatest game ever played.",
  "The tournament expanded to 64 teams in 1985, creating the bracket format we know today.",
  "Loyola Chicago's Sister Jean became a celebrity at age 98 cheering her team to the 2018 Final Four.",
  "In 2023, the odds of picking a perfect bracket were estimated at 1 in 9.2 quintillion.",
  "The lowest seed to ever reach the Final Four is an 11-seed — it's happened 5 times.",
  "Villanova's Kris Jenkins hit a buzzer-beating three to win the 2016 championship — one of the most iconic shots in history.",
  "The 'Cinderella' term for tournament underdogs dates back to the 1950s tournament coverage.",
  "George Mason, an 11-seed, shocked the world by reaching the 2006 Final Four.",
  "North Carolina and Duke are only 8 miles apart — the closest rivalry in college basketball.",
  "The tournament generates over $1 billion in TV ad revenue, making it one of the most lucrative sporting events.",
  "Steph Curry led 10-seed Davidson on a Cinderella run to the Elite Eight in 2008, launching his career.",
  "The First Four (play-in games) were added in 2011, expanding the field to 68 teams.",
  "Coach John Wooden won 10 NCAA championships with UCLA, a record that may never be broken.",
  "In 2011, Butler played the championship game in their home city of Indianapolis — and lost by 2.",
  "The 'One Shining Moment' song has been played at the end of every tournament since 1987.",
  "Warren Buffett once offered $1 billion for a perfect bracket. Nobody has ever come close.",
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
