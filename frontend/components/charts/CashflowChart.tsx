"use client";
// 回本曲線：按日期累積（出金 − 花費），正綠負紅區域
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Expense } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

export function cumulativeNet(rows: Expense[]): { date: string; net: number; spent: number; paid: number }[] {
  const byDate = new Map<string, { spent: number; paid: number }>();
  for (const r of rows) {
    const d = byDate.get(r.date) ?? { spent: 0, paid: 0 };
    if (r.kind === "payout") d.paid += r.amount;
    else d.spent += r.amount;
    byDate.set(r.date, d);
  }
  let spent = 0, paid = 0;
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      spent += d.spent;
      paid += d.paid;
      return { date, spent: Math.round(spent * 100) / 100, paid: Math.round(paid * 100) / 100, net: Math.round((paid - spent) * 100) / 100 };
    });
}

export default function CashflowChart({ rows, height = 180 }: { rows: Expense[]; height?: number }) {
  const data = cumulativeNet(rows);
  if (!data.length) return <Empty>還沒有收支紀錄</Empty>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cfFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.gold} stopOpacity={0.25} />
              <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false} minTickGap={40} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={52} tickFormatter={(v: number) => fmtMoney(v)} />
          <ReferenceLine y={0} stroke={C.muted} strokeDasharray="3 3" />
          <Tooltip
            {...tooltipStyle}
            formatter={(v, name) => [fmtMoney(Number(v), { sign: name === "net" }), name === "net" ? "累積淨利" : name === "paid" ? "累積出金" : "累積花費"]}
          />
          <Area type="stepAfter" dataKey="net" stroke={C.gold} strokeWidth={2} fill="url(#cfFill)" dot={false} />
          <Area type="stepAfter" dataKey="paid" stroke={C.green} strokeWidth={1} fill="none" dot={false} strokeDasharray="4 3" />
          <Area type="stepAfter" dataKey="spent" stroke={C.red} strokeWidth={1} fill="none" dot={false} strokeDasharray="4 3" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
