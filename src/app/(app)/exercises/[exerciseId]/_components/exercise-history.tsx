"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type SessionEntry = {
  date: string;
  sessionName: string;
  topSetWeight: number;
  topSetReps: number;
  avgWeight: number;
  avgReps: number;
  avgRir: number | null;
  sets: number;
};

export function ExerciseHistoryChart({ data }: { data: SessionEntry[] }) {
  if (data.length < 2) return null;

  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    weight: d.topSetWeight,
    avgWeight: d.avgWeight,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#888888" }}
          axisLine={{ stroke: "#333333" }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#888888" }}
          axisLine={{ stroke: "#333333" }}
          domain={["auto", "auto"]}
          label={{
            value: "lbs",
            angle: -90,
            position: "insideLeft",
            style: { fill: "#888888", fontSize: 11 },
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#111111",
            border: "1px solid #333333",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#ededed" }}
          formatter={(value, name) => [
            `${value} lbs`,
            name === "weight" ? "Top Set" : "Avg",
          ]}
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3, fill: "#3b82f6" }}
          name="Top Set"
        />
        <Line
          type="monotone"
          dataKey="avgWeight"
          stroke="#6b7280"
          strokeWidth={1}
          strokeDasharray="4 4"
          dot={false}
          name="Avg"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ExerciseHistoryTable({ data }: { data: SessionEntry[] }) {
  const first = data[0];
  const latest = data[data.length - 1];
  const weightChange = latest.topSetWeight - first.topSetWeight;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Badge
          variant={
            weightChange > 0
              ? "default"
              : weightChange < 0
                ? "destructive"
                : "secondary"
          }
          className="text-xs"
        >
          {weightChange > 0 ? "+" : ""}
          {weightChange} lbs
        </Badge>
        <span className="text-xs text-muted-foreground">
          across {data.length} sessions
        </span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">Date</TableHead>
            <TableHead className="text-xs">Top Set</TableHead>
            <TableHead className="text-xs">Avg W x R</TableHead>
            <TableHead className="text-xs">Sets</TableHead>
            <TableHead className="text-xs">Avg RIR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data
            .slice()
            .reverse()
            .map((entry, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs">
                  {new Date(entry.date).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-xs font-medium">
                  {entry.topSetWeight} x {entry.topSetReps}
                </TableCell>
                <TableCell className="text-xs">
                  {entry.avgWeight} x {entry.avgReps}
                </TableCell>
                <TableCell className="text-xs">{entry.sets}</TableCell>
                <TableCell className="text-xs">
                  {entry.avgRir !== null ? entry.avgRir : "—"}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
