import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AccuracyTrend } from "./api";

interface AccuracyChartProps {
  data: AccuracyTrend[];
  loading?: boolean;
}

export function AccuracyChart({ data, loading = false }: AccuracyChartProps) {
  if (loading) {
    return (
      <div className="bg-[#13131a] border border-white/8 rounded-xl p-5">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4">
          Monthly accuracy trend
        </div>
        <div className="h-[200px] flex items-center justify-center text-zinc-500">
          Loading chart...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#13131a] border border-white/8 rounded-xl p-5">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4">
        Monthly accuracy trend
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis
            dataKey="month"
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[60, 72]}
            tick={{ fill: "#71717a", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "#13131a",
              border: "0.5px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${value ?? 0}%`, "Accuracy"]}
          />
          <Line
            type="monotone"
            dataKey="acc"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ fill: "#6366f1", r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
