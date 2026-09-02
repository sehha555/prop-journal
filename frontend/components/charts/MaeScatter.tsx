"use client";
// MAE 分佈：每筆一個點 — 橫軸 = 最多曾賠幾點、縱軸 = 實際拿到幾點；綠 = 賺、紅 = 賠。
// 看「逆勢超過幾點就救不回來」，用來找停損該放哪。
import { CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import type { ExcursionTrade } from "@/lib/types";
import { fmtNyTime } from "@/lib/format";
import { C, axisTick, tooltipStyle } from "./theme";
import Empty from "@/components/ui/Empty";

export default function MaeScatter({ data, height = 220 }: { data: ExcursionTrade[]; height?: number }) {
  if (!data.length) return <Empty>還沒有持倉過程資料</Empty>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 6, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={C.line} strokeDasharray="2 4" />
          <XAxis type="number" dataKey="mae" name="mae" tick={axisTick} axisLine={{ stroke: C.line }} tickLine={false}
            domain={[0, "auto"]} label={{ value: "最多曾賠（點）", position: "insideBottomRight", offset: -2, fill: C.faint, fontSize: 10 }} />
          <YAxis type="number" dataKey="got" name="got" tick={axisTick} axisLine={false} tickLine={false} width={40} />
          <ReferenceLine y={0} stroke={C.muted} />
          <Tooltip
            {...tooltipStyle}
            cursor={{ stroke: C.line, strokeDasharray: "3 3" }}
            labelFormatter={() => ""}
            content={({ payload }) => {
              const t = payload?.[0]?.payload as ExcursionTrade | undefined;
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
          <Scatter data={data} shape="circle">
            {data.map((t) => <Cell key={t.id} fill={t.got >= 0 ? C.green : C.red} />)}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
