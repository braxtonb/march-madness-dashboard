import { fetchDashboardData } from "@/lib/sheets";
import { computeAllAnalytics, computePickRates } from "@/lib/analytics";
import { HeadToHeadContent } from "./HeadToHeadContent";

export const dynamic = "force-dynamic";

export default async function HeadToHeadPage() {
  const data = await fetchDashboardData();
  const analytics = computeAllAnalytics(data);
  const pickRates = computePickRates(data.picks, data.brackets.length);

  const analyticsObj = Object.fromEntries(analytics);
  const pickRatesObj: Record<string, Record<string, number>> = {};
  for (const [gid, teamRates] of pickRates) {
    pickRatesObj[gid] = Object.fromEntries(teamRates);
  }

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-2xl font-bold">Head-to-Head</h2>
        <p className="text-on-surface-variant text-sm mt-1">Compare any two brackets side by side</p>
      </div>
      <HeadToHeadContent brackets={data.brackets} picks={data.picks} games={data.games} analyticsObj={analyticsObj} pickRatesObj={pickRatesObj} currentRound={data.meta.current_round} />
    </div>
  );
}
