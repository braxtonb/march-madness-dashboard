import type { Meta } from "@/lib/types";
import { ROUND_LABELS } from "@/lib/constants";

export function Navbar({ meta }: { meta: Meta | null }) {
  const roundLabel = meta ? ROUND_LABELS[meta.current_round] : "Loading...";
  const gamesCompleted = meta?.games_completed ?? 0;

  let lastUpdated = "—";
  if (meta?.last_updated) {
    const updatedAt = new Date(meta.last_updated);
    const diffMs = Date.now() - updatedAt.getTime();
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) lastUpdated = "Just now";
    else if (diffMin < 60) lastUpdated = `${diffMin}m ago`;
    else lastUpdated = `${Math.round(diffMin / 60)}h ago`;
  }

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-surface-container">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-lg font-bold text-on-surface">
          DoorDash AP 2026 Bracket Lab
        </h1>
        <span className="rounded-card bg-surface-bright px-3 py-1 font-label text-xs text-secondary">
          {roundLabel}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-on-surface-variant">
        <span>{gamesCompleted}/63 games</span>
        <span>Updated {lastUpdated}</span>
      </div>
    </nav>
  );
}
