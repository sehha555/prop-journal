"use client";
// 績效分頁：6 張卡 + 權益曲線 / 每日 P&L / 持倉過程圖
import StatCard from "@/components/ui/StatCard";
import EquityChart from "@/components/charts/EquityChart";
import DailyBars from "@/components/charts/DailyBars";
import ExcursionChart from "@/components/charts/ExcursionChart";
import { fmtMoney, fmtNum, fmtPct, pnlColor } from "@/lib/format";
import type { PerformanceStats } from "@/lib/types";

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col gap-2 px-[18px] py-4">
      <div className="flex items-baseline justify-between">
        <div className="text-[14px] font-bold text-white">{title}</div>
        {hint && <div className="text-[11px] font-semibold text-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export default function PerformanceTab({ data }: { data: PerformanceStats | null }) {
  const d = data;
  const ex = d?.excursion;
  return (
    <>
      <div className="grid grid-cols-6 gap-3">
        <StatCard size="md" label="總 P&L" value={d ? fmtMoney(d.total_pnl, { sign: true }) : "—"} valueClass={pnlColor(d?.total_pnl)} hint={d ? `${d.trade_count} 筆` : undefined} />
        <StatCard size="md" label="勝率" value={fmtPct(d?.win_rate)} />
        <StatCard size="md" label="Profit Factor" value={fmtNum(d?.profit_factor)} hint="毛利 / 毛損，> 1.5 算穩" />
        <StatCard size="md" label="最大回撤" value={d ? fmtMoney(d.max_drawdown !== null ? -Math.abs(d.max_drawdown) : null) : "—"} valueClass="text-red" />
        <StatCard size="md" label="平均賺 / 賠" value={
          <span>
            <span className="text-green">{fmtMoney(d?.avg_win, { decimals: 0 })}</span>
            <span className="text-faint"> / </span>
            <span className="text-red">{fmtMoney(d?.avg_loss, { decimals: 0 })}</span>
          </span>
        } />
        <StatCard size="md" label="推保本後被掃" value={ex ? `${ex.be_stopped} / ${ex.be_count}` : "—"} hint="被掃 / 有推保本的筆數" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Panel title="權益曲線" hint="每日累積">
          <EquityChart data={d?.equity ?? []} height={180} />
        </Panel>
        <Panel title="每日 P&L">
          <DailyBars data={d?.daily ?? []} height={180} />
        </Panel>
      </div>
      <Panel
        title="持倉過程"
        hint={ex ? `綠柱 = 最多曾賺 · 紅柱 = 最多曾賠 · 白點 = 實際拿到（點）· 賺到手 ${fmtPct(ex.mfe_capture_pct)} · ${ex.with_mfe} / ${d?.trade_count} 筆有資料` : undefined}
      >
        <ExcursionChart data={ex?.trades ?? []} height={220} />
      </Panel>
    </>
  );
}
