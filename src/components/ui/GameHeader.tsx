import { TeamPill } from "./TeamPill";

export function GameHeader({
  game,
  teamLogos = {},
  eliminatedTeams,
}: {
  game: { team1: string; seed1: number; team2: string; seed2: number; completed: boolean; winner: string; espnUrl?: string; espn_url?: string };
  teamLogos?: Record<string, string>;
  eliminatedTeams?: Set<string>;
}) {
  const hasTeams = game.team1 && game.team2;

  // Only show ESPN link when we have a direct boxscore URL
  const espnLink = game.espn_url || game.espnUrl || undefined;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        {hasTeams ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <TeamPill
              name={game.team1}
              seed={game.seed1}
              logo={teamLogos[game.team1]}
              eliminated={eliminatedTeams?.has(game.team1)}
              showStatus={!!eliminatedTeams}
            />
            <span className="text-[10px] text-on-surface-variant">vs</span>
            <TeamPill
              name={game.team2}
              seed={game.seed2}
              logo={teamLogos[game.team2]}
              eliminated={eliminatedTeams?.has(game.team2)}
              showStatus={!!eliminatedTeams}
            />
          </div>
        ) : (
          <span className="text-xs text-on-surface-variant font-label">Matchup TBD</span>
        )}
        {game.completed && game.winner && (
          <p className="text-[10px] text-secondary mt-0.5">Winner: {game.winner}</p>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        {espnLink && (
          <a
            href={espnLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-label text-on-surface-variant/50 hover:text-primary transition-colors"
            title="View on ESPN"
            onClick={(e) => e.stopPropagation()}
          >
            ESPN ↗
          </a>
        )}
        <span className={`text-[10px] font-label bg-surface-container rounded-full px-2 py-0.5 ${game.completed ? "text-secondary" : "text-on-surface-variant"}`}>
          {game.completed ? "Final" : "Scheduled"}
        </span>
      </div>
    </div>
  );
}
