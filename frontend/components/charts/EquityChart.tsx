"use client";
// 權益曲線（每日累積 P&L）
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { EquityPoint } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

export default function EquityChart({ data, height = 160 }: { data: EquityPoint[]; height?: number }) {
  if (!data.length) return <Empty>尚無交易資料</Empty>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.gold} stopOpacity={0.25} />
              <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false} minTickGap={40} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => fmtMoney(v)} />
          <Tooltip {...tooltipStyle} formatter={(v) => [fmtMoney(Number(v), { sign: true }), "累積 P&L"]} />
          <Area type="monotone" dataKey="cum_pnl" stroke={C.gold} strokeWidth={2} fill="url(#eqFill)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
