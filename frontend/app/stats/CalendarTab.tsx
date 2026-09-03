"use client";
// 月曆分頁：每個紐約交易日一格，綠賺紅賠；週六那格放該週（週一到週日）合計
import { useState } from "react";
import { fmtMoney, pnlColor } from "@/lib/format";
import type { CalendarDay } from "@/lib/types";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 紐約今天（交易日用紐約時間切）
function nyToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

export default function CalendarTab({ days }: { days: CalendarDay[] | null }) {
  const today = nyToday();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1); // 0-based

  const byDate = new Map((days ?? []).map((d) => [d.date, d]));

  // 從該月第一天所在的週一開始，固定 6 列 42 格
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const rows = Array.from({ length: 6 }, (_, r) => cells.slice(r * 7, r * 7 + 7));

  const shift = (n: number) => {
    const d = new Date(year, month + n, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };
  const goToday = () => {
    setYear(Number(today.slice(0, 4)));
    setMonth(Number(today.slice(5, 7)) - 1);
  };

  const monthTotal = (days ?? []).filter((d) => d.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`));
  const monthPnl = monthTotal.reduce((s, d) => s + d.pnl, 0);
  const monthCount = monthTotal.reduce((s, d) => s + d.count, 0);

  return (
    <div className="card flex flex-col gap-3 px-[18px] py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shift(-1)} className="rounded-md border border-line px-2 py-[3px] text-[12px] font-bold text-muted hover:text-fg">‹</button>
          <div className="w-[110px] text-center text-[14px] font-bold text-white">{year} 年 {month + 1} 月</div>
          <button type="button" onClick={() => shift(1)} className="rounded-md border border-line px-2 py-[3px] text-[12px] font-bold text-muted hover:text-fg">›</button>
          <div className="ml-3 text-[12px] font-semibold text-muted">
            本月 <span className={pnlColor(monthPnl)}>{fmtMoney(monthPnl, { sign: true })}</span>，{monthCount} 筆
          </div>
        </div>
        <button type="button" onClick={goToday} className="rounded-md border border-line px-3 py-[5px] text-[12px] font-bold text-muted hover:text-fg">今天</button>
      </div>

      <div className="grid grid-cols-7 gap-[6px]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-semibold text-muted">{w}</div>
        ))}
        {rows.map((row) =>
          row.map((d, i) => {
            const key = ymd(d);
            const inMonth = d.getMonth() === month;
            const day = byDate.get(key);
            const isSat = i === 5;
            const week = row.map((x) => byDate.get(ymd(x))).filter(Boolean) as CalendarDay[];
            const weekPnl = week.reduce((s, x) => s + x.pnl, 0);
            const weekCount = week.reduce((s, x) => s + x.count, 0);
            const weekNo = Math.ceil(d.getDate() / 7);
            const tint = day ? (day.pnl > 0 ? "bg-green-bg" : day.pnl < 0 ? "bg-red-bg" : "") : "";
            return (
              <div
                key={key}
                className={
                  "flex min-h-[92px] flex-col items-center rounded-md border px-2 py-2 " +
                  (key === today ? "border-gold " : "border-line ") + tint + (inMonth ? "" : " opacity-35")
                }
              >
                <div className="text-[11px] font-semibold text-muted">{d.getDate()}</div>
                {isSat ? (
                  <>
                    <div className="mt-2 text-[11px] font-bold text-white">第 {weekNo} 週</div>
                    <div className={"text-[16px] font-extrabold " + (weekCount ? pnlColor(weekPnl) : "text-white")}>{fmtMoney(weekPnl)}</div>
                    <div className="text-[11px] font-semibold text-faint">{weekCount} 筆</div>
                  </>
                ) : day ? (
                  <>
                    <div className={"mt-2 text-[16px] font-extrabold " + pnlColor(day.pnl)}>{fmtMoney(day.pnl, { sign: true })}</div>
                    <div className="text-[11px] font-semibold text-faint">{day.count} 筆</div>
                  </>
                ) : null}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
