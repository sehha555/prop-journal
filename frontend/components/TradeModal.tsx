"use client";
// 手動新增交易：填進出場，P&L 與手續費照合約點值 / Topstep 費率自動算（可改）
import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Field from "@/components/ui/Field";
import { apiGet, apiSend, errorMessage } from "@/lib/api";
import type { ContractInfo, Trade } from "@/lib/types";
import { useAppStore } from "@/store";

// datetime-local 的值是瀏覽器本地時間，補上時區送後端
const toIso = (local: string) => new Date(local).toISOString();
const nowLocal = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function TradeModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (t: Trade) => void }) {
  const accounts = useAppStore((s) => s.accounts);
  const [contracts, setContracts] = useState<ContractInfo>({});
  const [accountId, setAccountId] = useState("");
  const [root, setRoot] = useState("MNQ");
  const [direction, setDirection] = useState<"long" | "short">("long");
  const [size, setSize] = useState("1");
  const [entryTime, setEntryTime] = useState(nowLocal);
  const [exitTime, setExitTime] = useState(nowLocal);
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [pnl, setPnl] = useState("");
  const [pnlTouched, setPnlTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) apiGet<ContractInfo>("/contracts").then(setContracts).catch((e) => setErr(errorMessage(e)));
  }, [open]);

  const info = contracts[root];
  const n = Number(size) || 0;
  const pts = entryPrice && exitPrice ? (Number(exitPrice) - Number(entryPrice)) * (direction === "long" ? 1 : -1) : null;
  const autoPnl = pts !== null && info ? pts * info.point_value * n : null;
  const fees = info ? info.fees * n : 0;
  const commissions = info ? info.commissions * n : 0;

  // 使用者沒手動改過 P&L 就跟著自動算的值走
  useEffect(() => {
    if (!pnlTouched) setPnl(autoPnl !== null ? String(Math.round(autoPnl * 100) / 100) : "");
  }, [autoPnl, pnlTouched]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!accountId) {
      setErr("請選帳戶");
      return;
    }
    setSaving(true);
    try {
      const t = await apiSend<Trade>("POST", "/trades", {
        account_id: Number(accountId),
        contract: root,
        direction,
        size: n,
        entry_time: toIso(entryTime),
        exit_time: toIso(exitTime),
        entry_price: Number(entryPrice),
        exit_price: Number(exitPrice),
        pnl: Number(pnl),
        fees: Math.round(fees * 100) / 100,
        commissions: Math.round(commissions * 100) / 100,
      });
      onCreated(t);
      onClose();
      setEntryPrice("");
      setExitPrice("");
      setPnlTouched(false);
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="新增交易" open={open} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="帳戶">
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
              <option value="">— 選帳戶 —</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.firm} · {a.name}</option>
              ))}
            </select>
          </Field>
          <Field label="商品">
            <select className="input" value={root} onChange={(e) => setRoot(e.target.value)}>
              {Object.keys(contracts).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="方向">
            <select className="input" value={direction} onChange={(e) => setDirection(e.target.value as "long" | "short")}>
              <option value="long">多</option>
              <option value="short">空</option>
            </select>
          </Field>
          <Field label="口數">
            <input className="input num" type="number" min="1" step="1" value={size} onChange={(e) => setSize(e.target.value)} required />
          </Field>
          <Field label="進場時間（本地）">
            <input className="input num" type="datetime-local" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} required />
          </Field>
          <Field label="出場時間（本地）">
            <input className="input num" type="datetime-local" value={exitTime} onChange={(e) => setExitTime(e.target.value)} required />
          </Field>
          <Field label="進場價">
            <input className="input num" type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} required />
          </Field>
          <Field label="出場價">
            <input className="input num" type="number" step="any" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} required />
          </Field>
          <Field label="P&L（$，自動算可改）">
            <input className="input num" type="number" step="any" value={pnl} onChange={(e) => { setPnl(e.target.value); setPnlTouched(true); }} required />
          </Field>
          <Field label="手續費 + 佣金（Topstep 費率）">
            <div className="input num text-muted">{info ? `$${(fees + commissions).toFixed(2)}` : "—"}</div>
          </Field>
        </div>
        {pts !== null && <div className="text-[11px] font-semibold text-faint">{pts >= 0 ? "+" : ""}{pts.toFixed(2)} 點 × ${info?.point_value ?? "?"} × {n} 口</div>}
        {err && <div className="text-[12px] font-semibold text-red">{err}</div>}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "儲存中…" : "新增"}</button>
        </div>
      </form>
    </Modal>
  );
}
