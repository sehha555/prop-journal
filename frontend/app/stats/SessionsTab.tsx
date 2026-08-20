"use client";
// 時段分頁（無 mockup）：四個切片各一張卡，長條 + 表格
import SliceBars from "@/components/charts/SliceBars";
import Empty from "@/components/ui/Empty";
import { fmtMoney, fmtPct, fmtR, pnlColor } from "@/lib/format";
import type { SessionStats, SliceRow } from "@/lib/types";

function SliceCard({ title, rows, chart = true }: { title: string; rows: SliceRow[] | undefined; chart?: boolean }) {
  return (
    <div className="card flex flex-col gap-2.5 px-[18px] py-4">
      <div className="text-[14px] font-bold text-white">{title}</div>
      {chart && rows && <SliceBars data={rows} height={120} />}
      {rows && rows.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <div className="th grid grid-cols-[1.4fr_0.7fr_0.7fr_1fr_0.9fr] gap-2.5 border-b border-line pb-1.5">
            <div>切片</div>
            <div className="text-right">筆數</div>
            <div className="text-right">勝率</div>
            <div className="text-right">P&L</div>
            <div className="text-right">平均 R</div>
          </div>
          {rows.map((r) => (
            <div key={String(r.key)} className="num grid grid-cols-[1.4fr_0.7fr_0.7fr_1fr_0.9fr] gap-2.5 text-[12px] font-semibold">
              <div>{r.label}</div>
              <div className="text-right text-muted">{r.trade_count}</div>
              <div className="text-right">{fmtPct(r.win_rate)}</div>
              <div className={`text-right ${pnlColor(r.pnl)}`}>{fmtMoney(r.pnl, { sign: true })}</div>
              <div className={`text-right ${pnlColor(r.avg_r)}`}>{fmtR(r.avg_r)}</div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>{rows ? "無資料" : "載入中…"}</Empty>
      )}
    </div>
  );
}

export default function SessionsTab({ data }: { data: SessionStats | null }) {
  // 小時切片只顯示有交易的時段，避免 24 列全空
  const hours = data?.by_hour.filter((h) => h.trade_count > 0);
  return (
    <div className="grid grid-cols-2 gap-3">
      <SliceCard title="Session（紐約時間）" rows={data?.by_session} />
      <SliceCard title="星期" rows={data?.by_weekday} />
      <SliceCard title="進場小時" rows={hours} />
      <SliceCard title="Setup" rows={data?.by_setup} />
    </div>
  );
}
