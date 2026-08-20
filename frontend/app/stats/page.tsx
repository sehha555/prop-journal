"use client";
// 統計：績效 / 時段 / consistency 三個 tab
import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ErrorBar from "@/components/ui/ErrorBar";
import FilterBar from "@/components/FilterBar";
import { apiGet, errorMessage, filterQuery } from "@/lib/api";
import type { ConsistencyStats, PerformanceStats, RCoverage, SessionStats } from "@/lib/types";
import { useAppStore, useEnsureAccounts } from "@/store";
import PerformanceTab from "./PerformanceTab";
import SessionsTab from "./SessionsTab";
import ConsistencyTab from "./ConsistencyTab";

type Tab = "performance" | "sessions" | "consistency";
const TABS: { key: Tab; label: string }[] = [
  { key: "performance", label: "績效" },
  { key: "sessions", label: "時段" },
  { key: "consistency", label: "Consistency" },
];

export default function StatsPage() {
  const filter = useAppStore((s) => s.filter);
  const accErr = useEnsureAccounts();
  const [tab, setTab] = useState<Tab>("performance");
  const [err, setErr] = useState<string | null>(null);
  const [perf, setPerf] = useState<PerformanceStats | null>(null);
  const [sess, setSess] = useState<SessionStats | null>(null);
  const [cons, setCons] = useState<ConsistencyStats | null>(null);

  // 切 tab 或改篩選就重抓該 tab 的資料
  useEffect(() => {
    const q = filterQuery(filter);
    let cancelled = false;
    const run = async () => {
      try {
        if (tab === "performance") setPerf(await apiGet<PerformanceStats>(`/stats/performance${q}`));
        else if (tab === "sessions") setSess(await apiGet<SessionStats>(`/stats/sessions${q}`));
        else setCons(await apiGet<ConsistencyStats>(`/stats/consistency${q}`));
        if (!cancelled) setErr(null);
      } catch (e) {
        if (!cancelled) setErr(errorMessage(e));
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [tab, filter]);

  const coverage: RCoverage | undefined =
    tab === "performance" ? perf?.r_coverage : tab === "sessions" ? sess?.r_coverage : cons?.r_coverage;
  const missing = coverage ? coverage.total - coverage.with_r : 0;

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

      {coverage && (
        <div className="text-[12px] font-semibold text-muted">
          {coverage.total} 筆交易中 <span className="text-fg">{coverage.with_r} 筆</span>有 R，以下 R 統計只算這 {coverage.with_r} 筆。
          {missing > 0 && (
            <>
              {" "}
              <a href="/trades/?missing_r=1" className="no-underline">補 {missing} 筆停損 →</a>
            </>
          )}
        </div>
      )}

      {tab === "performance" && <PerformanceTab data={perf} />}
      {tab === "sessions" && <SessionsTab data={sess} />}
      {tab === "consistency" && <ConsistencyTab data={cons} />}
    </>
  );
}
