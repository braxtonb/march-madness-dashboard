"use client";

import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label } from "recharts";

interface ScatterPoint {
  name: string;
  skill: number;
  fortune: number;
}

const COLORS = [
  "#2dd4bf", "#a78bfa", "#fbbf24", "#fb923c", "#3b82f6",
  "#06b6d4", "#84cc16", "#f472b6",
];

export function InsightFortuneScatter({ data }: { data: ScatterPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis type="number" dataKey="skill" name="Chalk Score" domain={[0, 100]} tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }}>
          <Label value="Chalk Score" position="bottom" fill="#8b95a5" fontSize={12} />
        </XAxis>
        <YAxis type="number" dataKey="fortune" name="Upset Score" domain={[0, 100]} tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }}>
          <Label value="Upset Score" angle={-90} position="left" fill="#8b95a5" fontSize={12} />
        </YAxis>
        <ReferenceLine x={50} stroke="#252d35" />
        <ReferenceLine y={50} stroke="#252d35" />
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
          formatter={(value: number, name: string) => [`${value.toFixed(0)}%`, name]}
          labelFormatter={(label) => {
            const point = data.find((d) => d.skill === label);
            return point?.name || "";
          }}
        />
        <Scatter data={data} fill="#2dd4bf">
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}
