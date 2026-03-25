import type { Meta, Bracket } from "@/lib/types";
import MyBracketBadge from "./MyBracketBadge";

export function Navbar({ meta, brackets = [] }: { meta: Meta | null; brackets?: Bracket[] }) {
  let lastChecked = "—";
  let lastCheckedExact = "";
  if (meta?.last_checked_at) {
    const diffMs = Date.now() - meta.last_checked_at;
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 1) lastChecked = "Just now";
    else if (diffMin < 60) lastChecked = `${diffMin}m ago`;
    else if (diffMin < 1440) lastChecked = `${Math.round(diffMin / 60)}h ago`;
    else lastChecked = `${Math.round(diffMin / 1440)}d ago`;

    const d = new Date(meta.last_checked_at);
    lastCheckedExact = d.toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
      timeZone: "America/New_York", timeZoneName: "short",
    });
  }

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-[#141a20]/60 backdrop-blur-xl shadow-2xl shadow-black/50">
      <div className="flex items-center gap-4 pl-10 md:pl-0">
        <h1 className="font-display text-lg font-bold text-on-surface truncate">
          <span className="hidden sm:inline">DoorDash AP 2026 Bracket Lab</span>
          <span className="sm:hidden">Bracket Lab</span>
        </h1>
      </div>
      <div className="flex items-center gap-4 text-sm text-on-surface-variant">
        <MyBracketBadge brackets={brackets} />
        <span className="hidden sm:flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
          </span>
          <span title={lastCheckedExact}>Checked {lastChecked}</span>
        </span>
      </div>
    </nav>
  );
}
