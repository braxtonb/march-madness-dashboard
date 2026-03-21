"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Legend } from "recharts";

interface RadarData {
  axis: string;
  person1: number;
  person2: number;
}

export function RadarComparison({ data, name1, name2 }: { data: RadarData[]; name1: string; name2: string }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="#252d35" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "#8b95a5", fontSize: 11, fontFamily: "Space Grotesk" }} />
        <Radar name={name1} dataKey="person1" stroke="#2dd4bf" fill="#2dd4bf" fillOpacity={0.2} />
        <Radar name={name2} dataKey="person2" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} />
        <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "Space Grotesk" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
