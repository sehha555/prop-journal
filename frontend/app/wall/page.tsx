"use client";
// 證書牆：上方兩個總數 + 卡片 + 新增表單
import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import ErrorBar from "@/components/ui/ErrorBar";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import Empty from "@/components/ui/Empty";
import { apiGet, apiSend, errorMessage } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import type { Certificate, CertificateKind } from "@/lib/types";
import { useAppStore, useEnsureAccounts } from "@/store";
import { useLoader } from "@/lib/useLoader";

export default function WallPage() {
  const accounts = useAppStore((s) => s.accounts);
  const accErr = useEnsureAccounts();
  const { data: certs, setData: setCerts, error: err, setError: setErr, reload: load } = useLoader(() => apiGet<Certificate[]>("/certificates"));
  const [modal, setModal] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [kind, setKind] = useState<CertificateKind>("payout");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  const accountLabel = (id: number) => {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.firm} · ${a.name}` : `帳戶 #${id}`;
  };

  // funded 資金 = 狀態 funded（kind funded 且非失敗/關閉）帳戶的 starting_balance 加總
  const fundedCapital = accounts
    .filter((a) => a.kind === "funded" && (a.status === "active" || a.status === "passed"))
    .reduce((s, a) => s + a.starting_balance, 0);
  const paidOut = certs?.filter((c) => c.kind === "payout").reduce((s, c) => s + (c.amount ?? 0), 0) ?? 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    if (!accountId) {
      setFormErr("請選帳戶");
      return;
    }
    setSaving(true);
    try {
      await apiSend<Certificate>("POST", "/certificates", {
        account_id: Number(accountId),
        kind,
        amount: kind === "payout" ? Number(amount) : null,
        date,
        note: note || null,
      });
      setModal(false);
      setAmount("");
      setNote("");
      load();
    } catch (e2) {
      setFormErr(errorMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await apiSend("DELETE", `/certificates/${id}`);
      setCerts((p) => p?.filter((c) => c.id !== id) ?? p);
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  const sorted = certs ? [...certs].sort((a, b) => b.date.localeCompare(a.date)) : [];

  return (
    <>
      <PageHeader
        title="證書牆"
        subtitle={certs ? `${certs.length} 張` : "載入中…"}
        actions={<button type="button" className="btn btn-primary" onClick={() => setModal(true)}>+ 證書</button>}
      />
      <ErrorBar message={err ?? accErr} onClose={() => setErr(null)} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Funded 資金總額" value={fmtMoney(fundedCapital)} hint="狀態 funded 帳戶的起始資金加總" />
        <StatCard accent label="累計出金" value={fmtMoney(paidOut)} hint="所有 payout 證書金額加總" />
      </div>

      {certs && certs.length === 0 ? (
        <div className="card"><Empty>還沒有證書，過關或出金後按「+ 證書」記一張</Empty></div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {sorted.map((c) => {
            const payout = c.kind === "payout";
            return (
              <div key={c.id} className={"card group flex flex-col gap-2.5 px-[18px] py-4" + (payout ? " border-gold-line bg-gold-card" : "")}>
                <div className="flex items-center justify-between">
                  <Badge tone={payout ? "gold" : "green"}>{payout ? "PAYOUT" : "PASSED"}</Badge>
                  <span className="num text-[11px] font-semibold text-faint">{c.date}</span>
                </div>
                <div className={"num text-[26px] font-extrabold " + (payout ? "text-gold" : "text-white")}>
                  {payout ? fmtMoney(c.amount) : "評估過關"}
                </div>
                <div className="text-[13px] font-bold text-fg">{accountLabel(c.account_id)}</div>
                <div className="flex items-center justify-between">
                  <div className="truncate text-[11px] font-semibold text-faint">{c.note ?? ""}</div>
                  <button type="button" className="btn btn-sm btn-danger opacity-0 group-hover:opacity-100" onClick={() => remove(c.id)}>刪除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal title="新增證書" open={modal} onClose={() => setModal(false)}>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="帳戶" className="col-span-2">
              <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                <option value="">選擇帳戶</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.firm} · {a.name}</option>
                ))}
              </select>
            </Field>
            <Field label="類型">
              <select className="input" value={kind} onChange={(e) => setKind(e.target.value as CertificateKind)}>
                <option value="payout">出金 payout</option>
                <option value="eval_passed">評估過關</option>
              </select>
            </Field>
            <Field label="日期">
              <input className="input num" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            {kind === "payout" && (
              <Field label="金額（$）" className="col-span-2">
                <input className="input num" type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
            )}
            <Field label="備註" className="col-span-2">
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          </div>
          {formErr && <div className="text-[12px] font-semibold text-red">{formErr}</div>}
          <div className="mt-1 flex justify-end gap-2">
            <button type="button" className="btn" onClick={() => setModal(false)}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "儲存中…" : "新增"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
