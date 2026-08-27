"use client";
// 收支：費用與出金同一張表；payout 是收入，其餘是支出
import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ErrorBar from "@/components/ui/ErrorBar";
import StatCard from "@/components/ui/StatCard";
import Field from "@/components/ui/Field";
import Empty from "@/components/ui/Empty";
import CashflowChart from "@/components/charts/CashflowChart";
import { apiGet, apiSend, errorMessage } from "@/lib/api";
import { EXPENSE_KIND_LABEL, fmtMoney, fmtPct, pnlColor } from "@/lib/format";
import type { Expense, ExpenseKind } from "@/lib/types";
import { useAppStore, useEnsureAccounts } from "@/store";
import { useLoader } from "@/lib/useLoader";

export default function ExpensesPage() {
  const accounts = useAppStore((s) => s.accounts);
  const accErr = useEnsureAccounts();
  const { data: rows, setData: setRows, error: err, setError: setErr, reload: load } = useLoader(() => apiGet<Expense[]>("/expenses"));
  const [accountId, setAccountId] = useState("");
  const [kind, setKind] = useState<ExpenseKind>("eval");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiSend<Expense>("POST", "/expenses", {
        account_id: accountId ? Number(accountId) : null,
        kind,
        amount: Number(amount),
        date,
        note: note || null,
      });
      setAmount("");
      setNote("");
      load();
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await apiSend("DELETE", `/expenses/${id}`);
      setRows((p) => p?.filter((r) => r.id !== id) ?? p);
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  const accountLabel = (id: number | null) => {
    if (id === null) return "通用";
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.firm} · ${a.name}` : `#${id}`;
  };

  const spent = rows?.filter((r) => r.kind !== "payout").reduce((s, r) => s + r.amount, 0) ?? 0;
  const paidOut = rows?.filter((r) => r.kind === "payout").reduce((s, r) => s + r.amount, 0) ?? 0;
  const net = paidOut - spent;
  // 報酬率 = 淨利 / 總花費；沒花過錢就沒有報酬率
  const roi = spent > 0 ? (net / spent) * 100 : null;
  const sorted = rows ? [...rows].sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <>
      <PageHeader title="收支" subtitle={rows ? `${rows.length} 筆` : "載入中…"} />
      <ErrorBar message={err ?? accErr} onClose={() => setErr(null)} />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="總花費" value={fmtMoney(spent)} hint="eval、reset、啟用、月費、其他" />
        <StatCard label="已出金" value={fmtMoney(paidOut)} hint="payout 加總" />
        <StatCard label="淨利" value={fmtMoney(net, { sign: true })} hint="已出金 − 總花費" accent />
        <StatCard label="報酬率" value={roi !== null ? `${roi >= 0 ? "+" : ""}${Math.round(roi)}%` : "—"} valueClass={pnlColor(roi)} hint="淨利 / 總花費" />
      </div>
      <div className="card flex flex-col gap-2 px-[18px] py-4">
        <div className="flex items-baseline justify-between">
          <div className="text-[14px] font-bold text-white">回本曲線</div>
          <div className="text-[11px] font-semibold text-muted">金線 = 累積淨利 · 綠虛線 = 累積出金 · 紅虛線 = 累積花費</div>
        </div>
        <CashflowChart rows={rows ?? []} />
      </div>

      {/* 新增表單 */}
      <form onSubmit={submit} className="card flex flex-wrap items-end gap-3 px-[18px] py-3.5">
        <Field label="帳戶">
          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">通用（不綁帳戶）</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.firm} · {a.name}</option>
            ))}
          </select>
        </Field>
        <Field label="類型">
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as ExpenseKind)}>
            {(Object.keys(EXPENSE_KIND_LABEL) as ExpenseKind[]).map((k) => (
              <option key={k} value={k}>{EXPENSE_KIND_LABEL[k]}</option>
            ))}
          </select>
        </Field>
        <Field label="金額（$）">
          <input className="input num w-[110px]" type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </Field>
        <Field label="日期">
          <input className="input num" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="備註" className="grow">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "儲存中…" : "+ 新增"}</button>
      </form>

      <div className="card px-[18px] py-3">
        <table className="w-full border-collapse text-[12px] font-semibold">
          <thead>
            <tr className="th border-b border-line text-left">
              <th className="py-1.5 pr-2 font-bold">日期</th>
              <th className="py-1.5 pr-2 font-bold">帳戶</th>
              <th className="py-1.5 pr-2 font-bold">類型</th>
              <th className="py-1.5 pr-2 text-right font-bold">金額</th>
              <th className="py-1.5 pr-2 font-bold">備註</th>
              <th className="py-1.5 font-bold"></th>
            </tr>
          </thead>
          <tbody className="num">
            {sorted.map((r) => (
              <tr key={r.id} className="group border-b border-line/60">
                <td className="py-2 pr-2">{r.date}</td>
                <td className="py-2 pr-2 text-muted">{accountLabel(r.account_id)}</td>
                <td className="py-2 pr-2">{EXPENSE_KIND_LABEL[r.kind] ?? r.kind}</td>
                <td className={`py-2 pr-2 text-right ${r.kind === "payout" ? "text-green" : ""}`}>{r.kind === "payout" ? "+" : "-"}{fmtMoney(r.amount, { decimals: 2 })}</td>
                <td className="py-2 pr-2 text-muted">{r.note ?? ""}</td>
                <td className="py-2 text-right">
                  <button type="button" className="btn btn-sm btn-danger opacity-0 group-hover:opacity-100" onClick={() => remove(r.id)}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && rows.length === 0 && <Empty>還沒有收支紀錄</Empty>}
      </div>
    </>
  );
}
