"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "next-themes";

type ChartData = {
  date: string;
  topWeight: number;
  avgWeight: number;
};

export function PerformanceChart({ data }: { data: ChartData[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Theme-aware colors
  const gridColor = isDark ? "#333333" : "#e5e7eb";
  const textColor = isDark ? "#a1a1aa" : "#71717a";
  const tooltipBg = isDark ? "#18181b" : "#ffffff";
  const tooltipBorder = isDark ? "#3f3f46" : "#e5e7eb";
  const tooltipText = isDark ? "#fafafa" : "#18181b";
  const primaryColor = isDark ? "#3b82f6" : "#2563eb";
  const secondaryColor = isDark ? "#6b7280" : "#9ca3af";

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: textColor }}
          axisLine={{ stroke: gridColor }}
          tickLine={{ stroke: gridColor }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: textColor }}
          axisLine={{ stroke: gridColor }}
          tickLine={{ stroke: gridColor }}
          label={{
            value: "Weight",
            angle: -90,
            position: "insideLeft",
            style: { fill: textColor, fontSize: 11 },
          }}
          domain={["dataMin - 10", "dataMax + 10"]}
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
          formatter={((value: number | undefined, name: string | undefined) => [
            `${value ?? 0} lbs`,
            name === "topWeight" ? "Top Set" : "Average",
          ]) as never}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value: string) => (
            <span style={{ color: textColor }}>
              {value === "topWeight" ? "Top Set" : "Average"}
            </span>
          )}
        />
        <Line
          type="monotone"
          dataKey="topWeight"
          stroke={primaryColor}
          strokeWidth={2}
          dot={{ fill: primaryColor, strokeWidth: 0, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 0 }}
        />
        <Line
          type="monotone"
          dataKey="avgWeight"
          stroke={secondaryColor}
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: secondaryColor, strokeWidth: 0, r: 3 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
