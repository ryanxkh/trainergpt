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
import { useTheme } from "next-themes";

// Match muscle-group-badge colors
const MUSCLE_COLORS: Record<string, string> = {
  chest: "#3b82f6",      // blue
  back: "#22c55e",       // green
  quads: "#a855f7",      // purple
  hamstrings: "#6366f1", // indigo
  glutes: "#ec4899",     // pink
  side_delts: "#f97316", // orange
  rear_delts: "#eab308", // yellow
  front_delts: "#f59e0b",// amber
  biceps: "#06b6d4",     // cyan
  triceps: "#14b8a6",    // teal
  calves: "#64748b",     // slate
  abs: "#ef4444",        // red
  traps: "#10b981",      // emerald
  forearms: "#78716c",   // stone
};

export function VolumeChart({
  data,
  muscleGroups,
}: {
  data: Record<string, unknown>[];
  muscleGroups: string[];
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (data.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Not enough data for chart yet.
      </p>
    );
  }

  // Theme-aware colors
  const gridColor = isDark ? "#333333" : "#e5e7eb";
  const textColor = isDark ? "#a1a1aa" : "#71717a";
  const tooltipBg = isDark ? "#18181b" : "#ffffff";
  const tooltipBorder = isDark ? "#3f3f46" : "#e5e7eb";
  const tooltipText = isDark ? "#fafafa" : "#18181b";

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="weekLabel"
          tick={{ fontSize: 11, fill: textColor }}
          axisLine={{ stroke: gridColor }}
          tickLine={{ stroke: gridColor }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: textColor }}
          axisLine={{ stroke: gridColor }}
          tickLine={{ stroke: gridColor }}
          label={{
            value: "Sets",
            angle: -90,
            position: "insideLeft",
            style: { fill: textColor, fontSize: 11 },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: tooltipBg,
            border: `1px solid ${tooltipBorder}`,
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: tooltipText, fontWeight: 600, marginBottom: 4 }}
          itemStyle={{ color: tooltipText }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value: string) => (
            <span style={{ color: textColor, textTransform: "capitalize" }}>
              {value.replace(/_/g, " ")}
            </span>
          )}
        />
        {muscleGroups.map((group) => (
          <Bar
            key={group}
            dataKey={group}
            stackId="volume"
            fill={MUSCLE_COLORS[group] || "#71717a"}
            name={group}
            radius={[2, 2, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
