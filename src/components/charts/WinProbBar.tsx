"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ProbEntry {
  name: string;
  probability: number;
  champion: string;
}

const CHAMP_COLORS = [
  "#2dd4bf", "#a78bfa", "#fbbf24", "#fb923c", "#3b82f6",
  "#06b6d4", "#84cc16", "#f472b6", "#e879f9", "#22d3ee",
];

export function WinProbBar({ data }: { data: ProbEntry[] }) {
  const champColorMap = new Map<string, string>();
  let ci = 0;
  for (const d of data) {
    if (!champColorMap.has(d.champion)) {
      champColorMap.set(d.champion, CHAMP_COLORS[ci % CHAMP_COLORS.length]);
      ci++;
    }
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, data.length * 28)}>
      <BarChart data={data} layout="vertical" margin={{ left: 100, right: 20 }}>
        <XAxis type="number" tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }} />
        <YAxis type="category" dataKey="name" tick={{ fill: "#e7ebf3", fontSize: 11, fontFamily: "Inter" }} width={90} />
        <Tooltip
          contentStyle={{ backgroundColor: "#141a20", border: "none", borderRadius: "12px", color: "#e7ebf3", fontFamily: "Inter" }}
          formatter={(value: number) => [`${value.toFixed(1)}%`, "Win Probability"]}
        />
        <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={champColorMap.get(entry.champion) || "#2dd4bf"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
