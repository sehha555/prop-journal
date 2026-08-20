"use client";
// 滾動 20 筆期望值折線，0 R 畫參考線
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtNyTime, fmtR } from "@/lib/format";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

export default function RollingLine({
  data,
  height = 130,
}: {
  data: { trade_id: number; exit_time: string; value: number }[];
  height?: number;
}) {
  if (!data.length) return <Empty>不足 20 筆有 R 的交易</Empty>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="exit_time" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false} minTickGap={50} tickFormatter={(v: string) => fmtNyTime(v).slice(0, 5)} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => v.toFixed(1)} />
          <ReferenceLine y={0} stroke={C.line} />
          <Tooltip {...tooltipStyle} formatter={(v) => [fmtR(Number(v)), "期望值"]} labelFormatter={(l) => fmtNyTime(String(l))} />
          <Line type="monotone" dataKey="value" stroke={C.gold} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
