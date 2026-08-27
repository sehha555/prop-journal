"use client";
// 持倉過程：每筆交易一組 — 綠柱往上 = 最多曾賺、紅柱往下 = 最多曾賠、白點 = 實際拿到（都是點數）
import { Bar, ComposedChart, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import type { ExcursionTrade } from "@/lib/types";
import { fmtNyTime } from "@/lib/format";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

export default function ExcursionChart({ data, height = 200 }: { data: ExcursionTrade[]; height?: number }) {
  if (!data.length) return <Empty>還沒有持倉過程資料（匯入 7 天內的交易會自動算，或在 Journal 手動填）</Empty>;
  const rows = data.map((t, i) => ({ ...t, idx: i + 1, maeNeg: -t.mae }));
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 6, right: 4, bottom: 0, left: 0 }} barCategoryGap="35%">
          <XAxis dataKey="idx" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false} minTickGap={16} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} tickFormatter={(v: number) => `${v}`} />
          <ReferenceLine y={0} stroke={C.line} />
          <Tooltip
            {...tooltipStyle}
            cursor={{ fill: "#23272d", opacity: 0.4 }}
            labelFormatter={(_, p) => {
              const r = p?.[0]?.payload as (typeof rows)[number] | undefined;
              return r ? `${fmtNyTime(r.exit_time)} · ${r.contract} ${r.direction === "long" ? "多" : "空"}` : "";
            }}
            formatter={(v, name) => {
              const n = Number(v);
              if (name === "mfe") return [`+${n.toFixed(2)} 點`, "最多曾賺"];
              if (name === "maeNeg") return [`-${Math.abs(n).toFixed(2)} 點`, "最多曾賠"];
              return [`${n >= 0 ? "+" : ""}${n.toFixed(2)} 點`, "實際拿到"];
            }}
          />
          <Bar dataKey="mfe" stackId="x" fill={C.green} radius={[2, 2, 0, 0]} />
          <Bar dataKey="maeNeg" stackId="x" fill={C.red} radius={[0, 0, 2, 2]} />
          <Scatter dataKey="got" fill="#ffffff" shape="circle" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
