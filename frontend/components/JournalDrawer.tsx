"use client";
// 右側滑出的 journal 欄：補停損 / MFE / MAE / setup / 備註，存檔後後端重算 R
import { useState } from "react";
import Field from "@/components/ui/Field";
import { apiSend, errorMessage } from "@/lib/api";
import { fmtMoney, fmtNyTime, fmtR, pnlColor, SESSION_LABEL } from "@/lib/format";
import type { Trade } from "@/lib/types";
import { useAppStore, useEnsureSetups } from "@/store";

const NEW_SETUP = "__new__";

export default function JournalDrawer({
  trade,
  onClose,
  onSaved,
}: {
  trade: Trade | null;
  onClose: () => void;
  onSaved: (t: Trade) => void;
}) {
  const { setups, addSetup } = useAppStore();
  const setupsErr = useEnsureSetups();
  // 父層用 key={trade.id} 重掛，所以初始值直接從 trade 來
  const [stop, setStop] = useState(trade?.planned_stop_pts != null ? String(trade.planned_stop_pts) : "");
  const [mfe, setMfe] = useState(trade?.mfe_pts != null ? String(trade.mfe_pts) : "");
  const [mae, setMae] = useState(trade?.mae_pts != null ? String(trade.mae_pts) : "");
  const [be, setBe] = useState(trade?.moved_to_be === 1);
  const [setup, setSetup] = useState(trade?.setup ?? "");
  const [newSetup, setNewSetup] = useState("");
  const [note, setNote] = useState(trade?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!trade) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const stopNum = stop === "" ? null : Number(stop);
    if (stopNum !== null && !(stopNum > 0)) {
      setErr("計畫停損必須大於 0");
      return;
    }
    const mfeNum = mfe === "" ? null : Number(mfe);
    const maeNum = mae === "" ? null : Number(mae);
    if ((mfeNum !== null && mfeNum < 0) || (maeNum !== null && maeNum < 0)) {
      setErr("MFE / MAE 填正數（點）");
      return;
    }
    setSaving(true);
    try {
      let setupName: string | null = setup || null;
      if (setup === NEW_SETUP) {
        const name = newSetup.trim();
        if (!name) {
          setErr("請輸入新 setup 名稱");
          setSaving(false);
          return;
        }
        const created = await addSetup(name);
        setupName = created.name;
        setSetup(created.name);
      }
      const updated = await apiSend<Trade>("PATCH", `/trades/${trade.id}`, {
        planned_stop_pts: stopNum,
        mfe_pts: mfeNum,
        mae_pts: maeNum,
        moved_to_be: be,
        setup: setupName,
        note: note || null,
      });
      onSaved(updated);
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setSaving(false);
    }
  };

  // setup 清單裡沒有但這筆已標的值也要顯示
  const names = setups.map((s) => s.name);
  const extra = trade.setup && !names.includes(trade.setup) ? [trade.setup] : [];

  return (
    <aside className="card sticky top-6 flex h-fit w-[300px] shrink-0 flex-col gap-3.5 px-[18px] py-4">
      <div className="flex items-center justify-between">
        <div className="text-[14px] font-bold text-white">Journal</div>
        <button type="button" onClick={onClose} className="text-muted hover:text-white" aria-label="關閉">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      <div className="num flex flex-col gap-1.5 text-[12px] font-semibold">
        <div className="flex justify-between"><span className="text-muted">進場</span><span>{fmtNyTime(trade.entry_time)} NY</span></div>
        <div className="flex justify-between"><span className="text-muted">合約</span><span>{trade.contract} ×{trade.size} {trade.direction === "long" ? "多" : "空"}</span></div>
        <div className="flex justify-between"><span className="text-muted">價格</span><span>{trade.entry_price} → {trade.exit_price}</span></div>
        <div className="flex justify-between"><span className="text-muted">時段</span><span>{trade.session ? SESSION_LABEL[trade.session] : "—"}</span></div>
        <div className="flex justify-between"><span className="text-muted">P&L</span><span className={pnlColor(trade.pnl)}>{fmtMoney(trade.pnl, { sign: true, decimals: 2 })}</span></div>
        <div className="flex justify-between"><span className="text-muted">風險 / R</span><span className={pnlColor(trade.r_multiple)}>{trade.risk_usd !== null ? `${fmtMoney(trade.risk_usd)} / ${fmtR(trade.r_multiple)}` : "—"}</span></div>
      </div>
      <div className="h-px bg-line" />

      <form onSubmit={save} className="flex flex-col gap-3">
        <Field label="計畫停損（點）">
          <input className="input num" type="number" min="0" step="any" value={stop} onChange={(e) => setStop(e.target.value)} placeholder="例 20" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="最大浮盈 MFE（點）">
            <input className="input num" type="number" min="0" step="any" value={mfe} onChange={(e) => setMfe(e.target.value)} placeholder="例 35" />
          </Field>
          <Field label="最大浮虧 MAE（點）">
            <input className="input num" type="number" min="0" step="any" value={mae} onChange={(e) => setMae(e.target.value)} placeholder="例 8" />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-semibold text-muted">
          <input type="checkbox" checked={be} onChange={(e) => setBe(e.target.checked)} />
          有推停損到保本（BE）
        </label>
        <Field label="Setup">
          <select className="input" value={setup} onChange={(e) => setSetup(e.target.value)}>
            <option value="">— 未標 —</option>
            {[...names, ...extra].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
            <option value={NEW_SETUP}>+ 新增 setup…</option>
          </select>
        </Field>
        {setup === NEW_SETUP && (
          <input className="input" value={newSetup} onChange={(e) => setNewSetup(e.target.value)} placeholder="新 setup 名稱" autoFocus />
        )}
        <Field label="備註">
          <textarea className="input min-h-[72px] resize-y" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {trade.symbol_root === null && (
          <div className="text-[11px] font-semibold text-gold">未知合約，無法算 R（仍可存備註）</div>
        )}
        {(err ?? setupsErr) && <div className="text-[12px] font-semibold text-red">{err ?? setupsErr}</div>}
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "儲存中…" : "儲存並重算 R"}</button>
      </form>
    </aside>
  );
}
