"use client";
// 績效分頁（無 mockup，沿用數字卡 + 權益曲線）
import StatCard from "@/components/ui/StatCard";
import EquityChart from "@/components/charts/EquityChart";
import { fmtMoney, fmtNum, fmtPct, pnlColor } from "@/lib/format";
import type { PerformanceStats } from "@/lib/types";

export default function PerformanceTab({ data }: { data: PerformanceStats | null }) {
  const d = data;
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <StatCard size="md" label="總 P&L" value={d ? fmtMoney(d.total_pnl, { sign: true }) : "—"} valueClass={pnlColor(d?.total_pnl)} hint={d ? `${d.trade_count} 筆` : undefined} />
        <StatCard size="md" label="勝率" value={fmtPct(d?.win_rate)} hint="獲利筆數 / 總筆數" />
        <StatCard size="md" label="Profit Factor" value={fmtNum(d?.profit_factor)} hint="毛利 / 毛損，> 1.5 算穩" />
        <StatCard size="md" label="最大回撤" value={d ? fmtMoney(d.max_drawdown !== null ? -Math.abs(d.max_drawdown) : null) : "—"} valueClass="text-red" hint="以累積 P&L 計" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <StatCard size="md" label="平均賺" value={fmtMoney(d?.avg_win, { sign: true, decimals: 0 })} valueClass="text-green" />
        <StatCard size="md" label="平均賠" value={fmtMoney(d?.avg_loss, { decimals: 0 })} valueClass="text-red" />
        <StatCard size="md" label="最大單筆賺 / 賠" value={
          <span>
            <span className="text-green">{fmtMoney(d?.max_win)}</span>
            <span className="text-faint"> / </span>
            <span className="text-red">{fmtMoney(d?.max_loss)}</span>
          </span>
        } />
        <StatCard size="md" label="單日最佳獲利佔比" value={fmtPct(d?.best_day_pct)} hint="出金規則常見上限 50%，僅顯示不警示" />
      </div>
      <div className="card flex grow flex-col gap-2 px-[18px] py-4">
        <div className="flex items-baseline justify-between">
          <div className="text-[14px] font-bold text-white">權益曲線</div>
          <div className="text-[11px] font-semibold text-muted">依篩選 · 每日累積</div>
        </div>
        <EquityChart data={d?.equity ?? []} height={220} />
      </div>
    </>
  );
}
