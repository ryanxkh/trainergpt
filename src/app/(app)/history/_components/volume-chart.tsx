"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const MUSCLE_COLORS: Record<string, string> = {
  chest: "#ef4444",
  back: "#3b82f6",
  quads: "#22c55e",
  hamstrings: "#f59e0b",
  glutes: "#a855f7",
  side_delts: "#06b6d4",
  rear_delts: "#0891b2",
  front_delts: "#0ea5e9",
  biceps: "#ec4899",
  triceps: "#f97316",
  calves: "#84cc16",
  abs: "#64748b",
  traps: "#78716c",
  forearms: "#d946ef",
};

export function VolumeChart({
  data,
  muscleGroups,
}: {
  data: Record<string, unknown>[];
  muscleGroups: string[];
}) {
  if (data.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Not enough data for chart yet.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="weekLabel"
          tick={{ fontSize: 12, fill: "#a1a1aa" }}
          axisLine={{ stroke: "#3f3f46" }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: "#a1a1aa" }}
          axisLine={{ stroke: "#3f3f46" }}
          label={{
            value: "Sets",
            angle: -90,
            position: "insideLeft",
            style: { fill: "#a1a1aa", fontSize: 12 },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#fafafa" }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value: string) => value.replace(/_/g, " ")}
        />
        {muscleGroups.map((group) => (
          <Bar
            key={group}
            dataKey={group}
            stackId="volume"
            fill={MUSCLE_COLORS[group] || "#71717a"}
            name={group}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
