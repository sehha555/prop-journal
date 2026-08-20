"use client";
// 費用：表格 + 新增表單 + 刪除
import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ErrorBar from "@/components/ui/ErrorBar";
import StatCard from "@/components/ui/StatCard";
import Field from "@/components/ui/Field";
import Empty from "@/components/ui/Empty";
import { apiGet, apiSend, errorMessage } from "@/lib/api";
import { EXPENSE_KIND_LABEL, fmtMoney } from "@/lib/format";
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

  const total = rows?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const monthly = rows?.filter((r) => r.kind === "subscription").reduce((s, r) => s + r.amount, 0) ?? 0;
  const sorted = rows ? [...rows].sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <>
      <PageHeader title="費用" subtitle={rows ? `${rows.length} 筆` : "載入中…"} />
      <ErrorBar message={err ?? accErr} onClose={() => setErr(null)} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="總花費" value={fmtMoney(total)} hint="所有費用加總" />
        <StatCard label="月費合計" value={fmtMoney(monthly)} hint="kind = subscription 的加總" />
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
                <td className="py-2 pr-2 text-right">{fmtMoney(r.amount, { decimals: 2 })}</td>
                <td className="py-2 pr-2 text-muted">{r.note ?? ""}</td>
                <td className="py-2 text-right">
                  <button type="button" className="btn btn-sm btn-danger opacity-0 group-hover:opacity-100" onClick={() => remove(r.id)}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && rows.length === 0 && <Empty>還沒有費用紀錄</Empty>}
      </div>
    </>
  );
}
