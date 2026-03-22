"use client";

import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Label } from "recharts";

interface ScatterPoint {
  name: string;
  skill: number;
  fortune: number;
  champion?: string;
  logo?: string;
}

function CustomDot(props: Record<string, unknown>) {
  const { cx, cy, payload } = props as { cx: number; cy: number; payload: ScatterPoint };
  if (!cx || !cy) return null;

  const logo = payload?.logo;
  const name = payload?.name || "";

  return (
    <g>
      {logo ? (
        <image
          x={cx - 10}
          y={cy - 10}
          width={20}
          height={20}
          href={logo}
          clipPath="circle(10px)"
        />
      ) : (
        <circle cx={cx} cy={cy} r={5} fill="#00f4fe" />
      )}
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        fill="#a7abb2"
        fontSize={9}
        fontFamily="Inter"
      >
        {name.length > 15 ? name.slice(0, 14) + "…" : name}
      </text>
    </g>
  );
}

export function InsightFortuneScatter({ data }: { data: ScatterPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(450, data.length * 3)}>
      <ScatterChart margin={{ top: 20, right: 30, bottom: 30, left: 30 }}>
        <XAxis
          type="number"
          dataKey="skill"
          name="Chalk Score"
          domain={[0, 100]}
          tick={{ fill: "#a7abb2", fontSize: 11, fontFamily: "Space Grotesk" }}
        >
          <Label value="Chalk Score →" position="bottom" fill="#a7abb2" fontSize={12} offset={-5} />
        </XAxis>
        <YAxis
          type="number"
          dataKey="fortune"
          name="Upset Score"
          domain={[0, 100]}
          tick={{ fill: "#a7abb2", fontSize: 11, fontFamily: "Space Grotesk" }}
        >
          <Label value="↑ Upset Score" angle={-90} position="left" fill="#a7abb2" fontSize={12} offset={-10} />
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
        <Scatter
          data={data}
          fill="#00f4fe"
          shape={<CustomDot />}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
