"use client";
// Consistency 分頁：照 Stats.dc.html mockup
import StatCard from "@/components/ui/StatCard";
import Empty from "@/components/ui/Empty";
import RHistogram from "@/components/charts/RHistogram";
import RollingLine from "@/components/charts/RollingLine";
import { fmtMoney, fmtNum, fmtNyTime, fmtR, pnlColor } from "@/lib/format";
import type { ConsistencyStats } from "@/lib/types";

export default function ConsistencyTab({ data }: { data: ConsistencyStats | null }) {
  const d = data;
  const blownTotal = d?.blown_r.reduce((s, t) => s + t.pnl, 0) ?? 0;

  // 同 setup R 標準差著色：< 1 綠、> 1.5 紅
  const stdColor = (v: number | null) => (v === null ? "text-faint" : v < 1 ? "text-green" : v > 1.5 ? "text-red" : "");

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <StatCard size="md" label="期望值（每筆平均）" value={fmtR(d?.expectancy_r)} valueClass={pnlColor(d?.expectancy_r)} hint="正值 = 長期有 edge" />
        <StatCard size="md" label="SQN" value={fmtNum(d?.sqn, 1)} hint={d?.sqn_grade ?? "平均 R / R 標準差 × √筆數"} />
        <StatCard size="md" label="R 標準差" value={fmtNum(d?.r_std)} hint="越小代表每筆結果越像" />
        <StatCard size="md" label="每日 P&L 標準差" value={fmtMoney(d?.daily_pnl_std)} hint={d ? `日均 ${fmtMoney(d.daily_pnl_mean, { sign: true })}` : undefined} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card flex flex-col gap-2 px-[18px] py-4">
          <div className="text-[14px] font-bold text-white">R 分布</div>
          <RHistogram data={d?.r_histogram ?? []} />
          <div className="text-[11px] font-semibold text-faint">-1R 那根最高是好事：多數虧損停在計畫停損。更左邊的是爆 R。</div>
        </div>
        <div className="card flex flex-col gap-2 px-[18px] py-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[14px] font-bold text-white">滾動 20 筆期望值</div>
            <div className="text-[11px] font-semibold text-muted">edge 有沒有在飄</div>
          </div>
          <RollingLine data={d?.rolling_expectancy ?? []} />
          <div className="text-[11px] font-semibold text-faint">掉到 0 附近時，回交易頁對照那段時間的 setup 與時段。</div>
        </div>
      </div>

      <div className="grid grow grid-cols-[3fr_2fr] gap-3">
        <div className="card flex flex-col gap-2.5 px-[18px] py-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[14px] font-bold text-white">爆 R（虧損超過計畫停損 1.5 倍）</div>
            <div className="num text-[12px] font-extrabold text-red">
              {d ? `${d.blown_r.length} 筆 · 合計 ${fmtMoney(blownTotal)}` : "—"}
            </div>
          </div>
          {d && d.blown_r.length === 0 ? (
            <Empty>沒有爆 R 的交易</Empty>
          ) : (
            <>
              <div className="th grid grid-cols-[1.3fr_1fr_1fr_0.8fr_1fr_1.4fr] gap-2.5 border-b border-line pb-1.5">
                <div>時間</div>
                <div>合約</div>
                <div>Setup</div>
                <div className="text-right">計畫</div>
                <div className="text-right">實際</div>
                <div>備註</div>
              </div>
              {d?.blown_r.map((t) => (
                <div key={t.id} className="num grid grid-cols-[1.3fr_1fr_1fr_0.8fr_1fr_1.4fr] gap-2.5 text-[12px] font-semibold">
                  <div>{fmtNyTime(t.entry_time)}</div>
                  <div>{t.symbol_root ?? t.contract} ×{t.size}</div>
                  <div>{t.setup ?? "—"}</div>
                  <div className="text-right">-1.0 R</div>
                  <div className="text-right text-red">{fmtR(t.r_multiple)}</div>
                  <div className="truncate text-muted">{t.note ?? (t.setup ? "" : "未標 setup")}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card flex flex-col gap-2.5 px-[18px] py-4">
          <div className="text-[14px] font-bold text-white">執行</div>
          <div className="flex flex-col gap-[9px] text-[12px] font-semibold">
            <div className="flex items-baseline justify-between">
              <span className="text-muted">賺錢日 / 賠錢日 平均筆數</span>
              <span className="num">
                {fmtNum(d?.avg_trades_win_day, 1)} /{" "}
                <span className={d && d.avg_trades_loss_day !== null && d.avg_trades_win_day !== null && d.avg_trades_loss_day > d.avg_trades_win_day ? "text-red" : ""}>
                  {fmtNum(d?.avg_trades_loss_day, 1)}
                </span>
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-muted">連賠 2 筆後下一筆口數</span>
              <span className={"num " + (d?.revenge_size_ratio !== null && d?.revenge_size_ratio !== undefined && d.revenge_size_ratio > 1.2 ? "text-red" : "")}>
                {d?.revenge_size_ratio !== null && d?.revenge_size_ratio !== undefined ? `${d.revenge_size_ratio.toFixed(1)}× 平常` : "—"}
              </span>
            </div>
            <div className="h-px bg-line" />
            <div className="th">同 setup 的 R 標準差</div>
            {d && d.setup_r_std.length === 0 && <div className="text-faint">還沒有標 setup 的交易</div>}
            {d?.setup_r_std.map((s) => (
              <div key={s.setup} className="flex justify-between">
                <span>{s.setup}</span>
                <span className={`num ${stdColor(s.r_std)}`}>
                  {s.r_std === null ? "不足 2 筆" : s.r_std.toFixed(1)} · {s.trade_count} 筆
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
