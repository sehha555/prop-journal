"use client";
// 總覽：四個總數、帳戶卡、權益曲線、本月 consistency
import Link from "next/link";
import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ErrorBar from "@/components/ui/ErrorBar";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Empty from "@/components/ui/Empty";
import AccountModal from "@/components/AccountModal";
import EquityChart from "@/components/charts/EquityChart";
import { apiGet, apiSend, errorMessage } from "@/lib/api";
import { fmtLocal, fmtMoney, fmtNum, fmtPct, fmtR, fmtSigned, pnlColor, STATUS_LABEL } from "@/lib/format";
import type { AccountStatus, Dashboard, DashboardAccount } from "@/lib/types";
import { useAppStore } from "@/store";
import { useLoader } from "@/lib/useLoader";

function AccountCard({ a, onStatus }: { a: DashboardAccount; onStatus: (id: number, s: AccountStatus) => void }) {
  const dim = a.status === "failed" || a.status === "closed";
  const tone = a.status === "failed" || a.status === "closed" ? "muted" : a.kind === "funded" ? "green" : "gold";
  const badgeText = a.status === "active" || a.status === "passed" ? a.kind.toUpperCase() : a.status.toUpperCase();

  // 進度條：eval 看距離過關目標；funded 看最佳日佔比（上限 50%）
  let bar: { pct: number; color: string } | null = null;
  let hint: string;
  if (a.kind === "eval" && a.profit_target) {
    const pct = Math.max(0, Math.min(100, (a.pnl / a.profit_target) * 100));
    bar = { pct, color: "bg-gold" };
    const remain = a.profit_target - a.pnl;
    hint = remain > 0 ? `距離過關 ${fmtMoney(a.profit_target)} 還差 ${fmtMoney(remain)}` : `已達過關目標 ${fmtMoney(a.profit_target)}`;
  } else if (a.kind === "funded" && a.best_day_pct !== null) {
    const pct = a.best_day_pct <= 1 ? a.best_day_pct * 100 : a.best_day_pct;
    bar = { pct: Math.min(100, pct * 2), color: "bg-green" };
    hint = `最佳日佔總獲利 ${Math.round(pct)}%（出金上限 50%）`;
  } else {
    hint = a.last_trade_at ? `最近交易 ${fmtLocal(a.last_trade_at)}` : "尚無交易";
  }
  if (dim) {
    bar = null;
    hint = a.note || `${STATUS_LABEL[a.status]}${a.last_trade_at ? ` · 最近交易 ${fmtLocal(a.last_trade_at).slice(0, 10)}` : ""}`;
  }

  return (
    <div className={"card flex flex-col gap-2.5 px-[18px] py-4" + (dim ? " opacity-55" : "")}>
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-bold text-white">
          {a.firm} · {a.name}
        </div>
        <Badge tone={tone}>{badgeText}</Badge>
      </div>
      <div className="num text-[26px] font-extrabold text-white">{fmtMoney(a.balance)}</div>
      <div className="flex justify-between text-[12px] font-semibold text-muted">
        <span className={`num ${pnlColor(a.pnl)}`}>{fmtSigned(a.pnl)}</span>
        <span className="num">
          勝率 {fmtPct(a.win_rate)} · {a.trade_count} 筆
        </span>
      </div>
      <div className="flex h-1 rounded-sm bg-line">
        {bar && <div className={`rounded-sm ${bar.color}`} style={{ width: `${bar.pct}%` }} />}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[11px] font-semibold text-faint">{hint}</div>
        <select
          className="input shrink-0 px-2 py-0.5 text-[11px]"
          value={a.status}
          onChange={(e) => onStatus(a.id, e.target.value as AccountStatus)}
          aria-label="帳戶狀態"
        >
          {(Object.keys(STATUS_LABEL) as AccountStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, error: err, setError: setErr, reload: load } = useLoader(() => apiGet<Dashboard>("/dashboard"));
  const [modal, setModal] = useState(false);
  const loadAccounts = useAppStore((s) => s.loadAccounts);

  const changeStatus = async (id: number, status: AccountStatus) => {
    try {
      await apiSend("PATCH", `/accounts/${id}`, { status });
      load();
      await loadAccounts();
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  const m = data?.month;
  const subtitle = data
    ? `${data.accounts.length} 個帳戶 · 最近匯入 ${data.last_import_at ? fmtLocal(data.last_import_at) : "—"}`
    : "載入中…";

  return (
    <>
      <PageHeader
        title="總覽"
        subtitle={subtitle}
        actions={
          <>
            <button type="button" className="btn" onClick={() => setModal(true)}>+ 帳戶</button>
            <Link href="/trades/" className="btn btn-primary no-underline hover:text-gold-ink">匯入 CSV</Link>
          </>
        }
      />
      <ErrorBar message={err} onClose={() => setErr(null)} />

      <div className="grid grid-cols-4 gap-3">
        <StatCard accent label="淨利（payout − 所有費用）" value={data ? fmtMoney(data.totals.net, { sign: true }) : "—"} />
        <StatCard label="已出金" value={data ? fmtMoney(data.totals.paid_out) : "—"} />
        <StatCard label="總花費" value={data ? fmtMoney(data.totals.spent) : "—"} />
        <StatCard label="每月固定" value={data ? fmtMoney(data.totals.monthly_recurring) : "—"} />
      </div>

      {data && data.accounts.length === 0 ? (
        <div className="card">
          <Empty>還沒有帳戶，按右上角「+ 帳戶」建立第一個</Empty>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {data?.accounts.map((a) => (
            <AccountCard key={a.id} a={a} onStatus={changeStatus} />
          ))}
        </div>
      )}

      <div className="grid grow grid-cols-[3fr_2fr] gap-3">
        <div className="card flex flex-col gap-2 px-[18px] py-4">
          <div className="flex items-baseline justify-between">
            <div className="text-[14px] font-bold text-white">權益曲線</div>
            <div className="text-[11px] font-semibold text-muted">全部帳戶 · 每日累積</div>
          </div>
          <EquityChart data={data?.equity ?? []} />
        </div>
        <div className="card flex flex-col gap-2.5 px-[18px] py-4">
          <div className="text-[14px] font-bold text-white">本月 consistency</div>
          <div className="flex flex-col gap-2 text-[13px] font-semibold">
            <div className="flex justify-between">
              <span className="text-muted">期望值</span>
              <span className={`num ${pnlColor(m?.expectancy_r)}`}>{fmtR(m?.expectancy_r)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">SQN</span>
              <span className="num">{fmtNum(m?.sqn, 1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">爆 R</span>
              <span className={`num ${m && m.blown_r_count > 0 ? "text-red" : ""}`}>{m ? `${m.blown_r_count} 筆` : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">未補停損</span>
              {m && m.missing_r_count > 0 ? (
                <Link href="/trades/?missing_r=1" className="num text-gold no-underline">{m.missing_r_count} 筆 →</Link>
              ) : (
                <span className="num">{m ? "0 筆" : "—"}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <AccountModal open={modal} onClose={() => setModal(false)} onCreated={load} />
    </>
  );
}
