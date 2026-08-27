"use client";
// 每日 P&L 長條（正綠負紅）
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtMoney } from "@/lib/format";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

export default function DailyBars({ data, height = 160 }: { data: { date: string; pnl: number }[]; height?: number }) {
  if (!data.length) return <Empty>尚無交易資料</Empty>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
          <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false} minTickGap={30} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => fmtMoney(v)} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "#23272d", opacity: 0.4 }} formatter={(v) => [fmtMoney(Number(v), { sign: true }), "當日 P&L"]} />
          <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.date} fill={d.pnl >= 0 ? C.green : C.red} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
