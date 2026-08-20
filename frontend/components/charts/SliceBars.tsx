"use client";
// 時段分頁用：各切片的 P&L 長條（正綠負紅）
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SliceRow } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

export default function SliceBars({ data, height = 140 }: { data: SliceRow[]; height?: number }) {
  if (!data.length) return <Empty>無資料</Empty>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
          <XAxis dataKey="label" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false} interval={0} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => fmtMoney(v)} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "#23272d", opacity: 0.4 }} formatter={(v) => [fmtMoney(Number(v), { sign: true }), "P&L"]} />
          <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
            {data.map((d) => (
              <Cell key={String(d.key)} fill={d.pnl >= 0 ? C.green : C.red} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
