"use client";

import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label } from "recharts";

interface ScatterPoint {
  name: string;
  insight: number;
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
        <XAxis type="number" dataKey="insight" name="Insight" domain={[0, 100]} tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }}>
          <Label value="Insight Score" position="bottom" fill="#8b95a5" fontSize={12} />
        </XAxis>
        <YAxis type="number" dataKey="fortune" name="Fortune" domain={[0, 100]} tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }}>
          <Label value="Fortune Score" angle={-90} position="left" fill="#8b95a5" fontSize={12} />
        </YAxis>
        <ReferenceLine x={50} stroke="#252d35" />
        <ReferenceLine y={50} stroke="#252d35" />
        <Tooltip
          contentStyle={{ backgroundColor: "#141a20", border: "none", borderRadius: "12px", color: "#e7ebf3", fontFamily: "Inter" }}
          formatter={(value: number, name: string) => [`${value.toFixed(0)}%`, name]}
          labelFormatter={(label) => {
            const point = data.find((d) => d.insight === label);
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
