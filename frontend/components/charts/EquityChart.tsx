"use client";
// 權益曲線：每日累積 P&L，或單一帳戶的收盤餘額加 Topstep MLL / DLL 線
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AccountCurvePoint, EquityPoint } from "@/lib/types";
import { fmtMoney } from "@/lib/format";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

const LABEL: Record<string, string> = { cum_pnl: "累積 P&L", balance: "收盤餘額", mll: "MLL 最大回撤", dll: "DLL 每日虧損（參考）" };

export default function EquityChart({ data, height = 160 }: { data: EquityPoint[] | AccountCurvePoint[]; height?: number }) {
  if (!data.length) return <Empty>尚無交易資料</Empty>;
  const rules = "balance" in data[0];
  const key = rules ? "balance" : "cum_pnl";
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data as (EquityPoint | AccountCurvePoint)[]} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.gold} stopOpacity={0.25} />
              <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false} minTickGap={40} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={60} domain={["auto", "auto"]} tickFormatter={(v: number) => fmtMoney(v)} />
          <Tooltip {...tooltipStyle} formatter={(v, name) => [fmtMoney(Number(v), { sign: !rules }), LABEL[String(name)] ?? name]} />
          <Area type="monotone" dataKey={key} name={key} stroke={C.gold} strokeWidth={2} fill="url(#eqFill)" baseValue="dataMin" dot={false} />
          {rules && <Line type="stepAfter" dataKey="mll" name="mll" stroke={C.red} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />}
          {rules && <Line type="stepAfter" dataKey="dll" name="dll" stroke={C.muted} strokeWidth={1} strokeDasharray="2 4" dot={false} />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
