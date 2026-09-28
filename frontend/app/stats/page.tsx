"use client";
// 統計：績效 / 時段 / 月曆三個 tab
import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ErrorBar from "@/components/ui/ErrorBar";
import FilterBar from "@/components/FilterBar";
import { apiGet, errorMessage, filterQuery } from "@/lib/api";
import type { CalendarDay, PerformanceStats, SessionStats } from "@/lib/types";
import { useAppStore, useEnsureAccounts } from "@/store";
import PerformanceTab from "./PerformanceTab";
import SessionsTab from "./SessionsTab";
import CalendarTab from "./CalendarTab";

type Tab = "performance" | "sessions" | "calendar";
const TABS: { key: Tab; label: string }[] = [
  { key: "performance", label: "績效" },
  { key: "sessions", label: "時段" },
  { key: "calendar", label: "月曆" },
];

export default function StatsPage() {
  const filter = useAppStore((s) => s.filter);
  const accErr = useEnsureAccounts();
  const [tab, setTab] = useState<Tab>("performance");
  const [err, setErr] = useState<string | null>(null);
  const [perf, setPerf] = useState<PerformanceStats | null>(null);
  const [sess, setSess] = useState<SessionStats | null>(null);
  const [cal, setCal] = useState<CalendarDay[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0); // 重算持倉過程後 +1 觸發重抓

  // 切 tab、改篩選、或子元件要求重載就重抓該 tab 的資料
  useEffect(() => {
    const q = filterQuery(filter);
    let cancelled = false;
    const run = async () => {
      try {
        if (tab === "performance") setPerf(await apiGet<PerformanceStats>(`/stats/performance${q}`));
        else if (tab === "sessions") setSess(await apiGet<SessionStats>(`/stats/sessions${q}`));
        else setCal((await apiGet<{ days: CalendarDay[] }>(`/stats/calendar${q}`)).days);
        if (!cancelled) setErr(null);
      } catch (e) {
        if (!cancelled) setErr(errorMessage(e));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tab, filter, reloadKey]);

  return (
    <>
      <PageHeader
        title="統計"
        left={
          <div className="flex gap-1 rounded-lg border border-line bg-card p-[3px]">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  "rounded-md px-3 py-[5px] text-[12px] " +
                  (tab === t.key ? "bg-gold font-extrabold text-gold-ink" : "font-bold text-muted hover:text-fg")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        }
        actions={<FilterBar />}
      />
      <ErrorBar message={err ?? accErr} onClose={() => setErr(null)} />

      {tab === "performance" && <PerformanceTab data={perf} onReload={() => setReloadKey((k) => k + 1)} />}
      {tab === "sessions" && <SessionsTab data={sess} />}
      {tab === "calendar" && <CalendarTab days={cal} />}
    </>
  );
}
