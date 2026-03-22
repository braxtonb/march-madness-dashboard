import { TeamPill } from "./TeamPill";

export function GameHeader({
  game,
  teamLogos = {},
}: {
  game: { team1: string; seed1: number; team2: string; seed2: number; completed: boolean; winner: string };
  teamLogos?: Record<string, string>;
}) {
  const hasTeams = game.team1 && game.team2;
  return (
    <div className="flex items-center justify-between">
      <div>
        {hasTeams ? (
          <div className="flex items-center gap-1.5">
            <TeamPill name={game.team1} seed={game.seed1} logo={teamLogos[game.team1]} />
            <span className="text-[10px] text-on-surface-variant">vs</span>
            <TeamPill name={game.team2} seed={game.seed2} logo={teamLogos[game.team2]} />
          </div>
        ) : (
          <span className="text-xs text-on-surface-variant font-label">Matchup TBD</span>
        )}
        {game.completed && game.winner && (
          <p className="text-[10px] text-secondary mt-0.5">Winner: {game.winner}</p>
        )}
      </div>
      <span className={`text-[10px] font-label bg-surface-container rounded-full px-2 py-0.5 ${game.completed ? "text-secondary" : "text-on-surface-variant"}`}>
        {game.completed ? "Final" : "Scheduled"}
      </span>
    </div>
  );
}
