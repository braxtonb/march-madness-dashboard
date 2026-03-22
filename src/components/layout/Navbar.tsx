import type { Meta, Bracket } from "@/lib/types";
import MyBracketBadge from "./MyBracketBadge";

export function Navbar({ meta, brackets = [] }: { meta: Meta | null; brackets?: Bracket[] }) {
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
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-[#141a20]/60 backdrop-blur-xl shadow-2xl shadow-black/50">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-lg font-bold text-on-surface">
          DoorDash AP 2026 Bracket Lab
        </h1>
      </div>
      <div className="flex items-center gap-4 text-sm text-on-surface-variant">
        <MyBracketBadge brackets={brackets} />
        <span className="hidden sm:flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
          </span>
          Updated {lastUpdated}
        </span>
      </div>
    </nav>
  );
}
