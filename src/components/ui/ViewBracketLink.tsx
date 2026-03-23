import Link from "next/link";

/** Small pill-style link to view a bracket's picks in the bracket view */
export function ViewBracketLink({ bracketId, className = "" }: { bracketId: string; className?: string }) {
  return (
    <Link
      href={`/picks?view=results&rview=bracket&bracket=${bracketId}`}
      className={`inline-flex items-center gap-1 rounded-full bg-secondary/10 hover:bg-secondary/20 text-secondary px-2 py-0.5 text-[9px] font-label transition-colors shrink-0 ${className}`}
      title="View bracket picks"
      onClick={(e) => e.stopPropagation()}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 2h2v3h2" /><path d="M1 8h2v-3" /><path d="M1 16h2v3h2" /><path d="M1 22h2v-3" /><path d="M5 5h2v6" /><path d="M5 19h2v-6" /><path d="M7 11h5v1" />
        <path d="M23 2h-2v3h-2" /><path d="M23 8h-2v-3" /><path d="M23 16h-2v3h-2" /><path d="M23 22h-2v-3" /><path d="M19 5h-2v6" /><path d="M19 19h-2v-6" /><path d="M17 11h-5" />
      </svg>
      VIEW BRACKET
    </Link>
  );
}
