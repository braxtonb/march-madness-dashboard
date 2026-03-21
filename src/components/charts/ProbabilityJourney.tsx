"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface JourneyPoint {
  round: string;
  [bracketName: string]: string | number;
}

const LINE_COLORS = [
  "#2dd4bf", "#a78bfa", "#fbbf24", "#fb923c", "#3b82f6",
  "#06b6d4", "#84cc16", "#f472b6", "#e879f9", "#22d3ee",
];

export function ProbabilityJourney({ data, bracketNames }: { data: JourneyPoint[]; bracketNames: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <XAxis dataKey="round" tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }} />
        <YAxis tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }} tickFormatter={(v) => `${v}%`} />
        <Tooltip
          contentStyle={{ backgroundColor: "#1a2027", border: "1px solid rgba(0, 244, 254, 0.15)", borderRadius: "12px", color: "#e7ebf3", fontFamily: "Inter", fontSize: "12px" }}
          formatter={(value: number) => `${value.toFixed(1)}%`}
        />
        <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "Space Grotesk" }} />
        {bracketNames.map((name, i) => (
          <Line key={name} type="monotone" dataKey={name} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
