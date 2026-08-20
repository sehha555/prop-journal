"use client";
// R 分布長條：負桶紅、0 桶灰、正桶綠
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

function bucketColor(b: string): string {
  if (b.startsWith("-") || b.startsWith("<")) return C.red;
  if (b === "0") return C.muted;
  return C.green;
}

export default function RHistogram({ data, height = 130 }: { data: { bucket: string; count: number }[]; height?: number }) {
  if (!data.length || data.every((d) => d.count === 0)) return <Empty>沒有可用的 R 資料</Empty>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} barCategoryGap="25%">
          <XAxis dataKey="bucket" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "#23272d", opacity: 0.4 }} formatter={(v) => [String(v), "筆數"]} labelFormatter={(l) => `${l} R`} />
          <Bar dataKey="count" radius={[2, 2, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.bucket} fill={bucketColor(d.bucket)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
