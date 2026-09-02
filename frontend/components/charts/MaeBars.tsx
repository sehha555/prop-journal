"use client";
// MAE 分佈：每筆一條橫條，長度 = 最多曾賠幾點，綠賺紅賠，由短到長排。
// 虛線 = 獲利單裡最大的 MAE：停損放這裡以外，所有賺錢單都保得住；線右邊的紅條是「逆勢超過這裡就沒救」的單。
import { Bar, BarChart, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExcursionTrade } from "@/lib/types";
import { fmtNyTime } from "@/lib/format";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

export default function MaeBars({ data }: { data: ExcursionTrade[] }) {
  if (!data.length) return <Empty>還沒有持倉過程資料</Empty>;
  const rows = [...data]
    .sort((a, b) => a.mae - b.mae)
    .map((t) => ({ ...t, label: fmtNyTime(t.exit_time).slice(0, 5), win: t.got >= 0 }));
  const winMae = rows.filter((r) => r.win).map((r) => r.mae);
  const stop = winMae.length ? Math.max(...winMae) : null;
  return (
    <div style={{ height: Math.max(160, rows.length * 26 + 30) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 18, right: 48, bottom: 0, left: 0 }} barCategoryGap="30%">
          <XAxis type="number" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false} domain={[0, "auto"]} unit=" 點" />
          <YAxis type="category" dataKey="label" tick={axisTick} axisLine={false} tickLine={false} width={44} />
          {stop !== null && (
            <ReferenceLine x={stop} stroke={C.gold} strokeDasharray="4 4"
              label={{ value: `停損放 ${stop} 點以外，賺錢單全保住`, position: "top", fill: C.gold, fontSize: 10, fontWeight: 600 }} />
          )}
          <Tooltip
            {...tooltipStyle}
            cursor={{ fill: "#23272d", opacity: 0.4 }}
            content={({ payload }) => {
              const t = payload?.[0]?.payload as (typeof rows)[number] | undefined;
              if (!t) return null;
              return (
                <div style={tooltipStyle.contentStyle} className="px-2 py-1.5">
                  <div style={tooltipStyle.labelStyle}>{fmtNyTime(t.exit_time)} · {t.contract} {t.direction === "long" ? "多" : "空"}</div>
                  <div>最多曾賠 -{t.mae.toFixed(2)} 點</div>
                  <div>實際拿到 {t.got >= 0 ? "+" : ""}{t.got.toFixed(2)} 點</div>
                </div>
              );
            }}
          />
          <Bar dataKey="mae" radius={[0, 2, 2, 0]}>
            {rows.map((r) => <Cell key={r.id} fill={r.win ? C.green : C.red} />)}
            <LabelList dataKey="mae" position="right" fill={C.muted} fontSize={10} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
