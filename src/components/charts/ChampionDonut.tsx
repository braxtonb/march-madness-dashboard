"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChampionSlice {
  name: string;
  count: number;
  alive: boolean;
}

export function ChampionDonut({ data }: { data: ChampionSlice[] }) {
  const ALIVE_COLORS = [
    "#2dd4bf", "#a78bfa", "#fbbf24", "#fb923c", "#3b82f6",
    "#06b6d4", "#84cc16", "#f472b6",
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          stroke="none"
        >
          {data.map((entry, i) => (
            <Cell
              key={entry.name}
              fill={
                entry.alive
                  ? ALIVE_COLORS[i % ALIVE_COLORS.length]
                  : "#252d35"
              }
              opacity={entry.alive ? 1 : 0.4}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#f0f4ff",
            border: "1px solid #00f4fe",
            borderRadius: "8px",
            color: "#080c10",
            fontFamily: "Inter",
            fontSize: "12px",
            padding: "8px 12px",
          }}
          formatter={(value: number, name: string) => [
            `${value} brackets`,
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", fontFamily: "Space Grotesk" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
