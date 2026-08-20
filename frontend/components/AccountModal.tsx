"use client";
// 新增帳戶表單（總覽頁「+ 帳戶」）
import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import { apiSend, errorMessage } from "@/lib/api";
import type { Account, AccountKind } from "@/lib/types";
import { useAppStore } from "@/store";

export default function AccountModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const loadAccounts = useAppStore((s) => s.loadAccounts);
  const [firm, setFirm] = useState("Topstep");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("eval");
  const [balance, setBalance] = useState("50000");
  const [target, setTarget] = useState("3000");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiSend<Account>("POST", "/accounts", {
        firm,
        name,
        kind,
        starting_balance: Number(balance),
        profit_target: target ? Number(target) : null,
        note: note || null,
      });
      await loadAccounts();
      onCreated?.();
      onClose();
      setName("");
      setNote("");
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="新增帳戶" open={open} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Firm">
            <input className="input" value={firm} onChange={(e) => setFirm(e.target.value)} required />
          </Field>
          <Field label="帳戶名稱">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="50K Combine" required />
          </Field>
          <Field label="類型">
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}>
              <option value="eval">eval</option>
              <option value="funded">funded</option>
            </select>
          </Field>
          <Field label="起始資金（$）">
            <input className="input num" type="number" min="0" step="any" value={balance} onChange={(e) => setBalance(e.target.value)} required />
          </Field>
          <Field label="過關目標（$，可空）">
            <input className="input num" type="number" min="0" step="any" value={target} onChange={(e) => setTarget(e.target.value)} />
          </Field>
          <Field label="備註">
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        {err && <div className="text-[12px] font-semibold text-red">{err}</div>}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "儲存中…" : "建立"}</button>
        </div>
      </form>
    </Modal>
  );
}
