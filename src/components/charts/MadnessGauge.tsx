"use client";

import { PieChart, Pie, Cell } from "recharts";

export function MadnessGauge({ value }: { value: number }) {
  const data = [
    { value: value },
    { value: 100 - value },
  ];

  const getColor = (v: number) => {
    if (v < 30) return "#2dd4bf";
    if (v < 60) return "#fbbf24";
    return "#ff9159";
  };

  return (
    <div className="flex flex-col items-center">
      <PieChart width={200} height={120}>
        <Pie
          data={data}
          cx={100}
          cy={100}
          startAngle={180}
          endAngle={0}
          innerRadius={60}
          outerRadius={80}
          dataKey="value"
          stroke="none"
        >
          <Cell fill={getColor(value)} />
          <Cell fill="#252d35" />
        </Pie>
      </PieChart>
      <div className="-mt-8 text-center">
        <span className="font-display text-3xl font-bold" style={{ color: getColor(value) }}>
          {value}
        </span>
        <p className="text-xs text-on-surface-variant mt-1">Madness Index</p>
      </div>
    </div>
  );
}
