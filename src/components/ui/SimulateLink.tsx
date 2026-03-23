import Link from "next/link";

/** Small pill link to simulate a bracket's path to victory */
export function SimulateLink({ bracketId, className = "" }: { bracketId: string; className?: string }) {
  return (
    <Link
      href={`/simulator#scenario=bracket:${bracketId}`}
      className={`inline-flex items-center gap-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary px-2 py-0.5 text-[9px] font-label transition-colors shrink-0 ${className}`}
      title="Simulate path to victory"
      onClick={(e) => e.stopPropagation()}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="5 3 19 12 5 21 5 3" />
      </svg>
      SIMULATE
    </Link>
  );
}
