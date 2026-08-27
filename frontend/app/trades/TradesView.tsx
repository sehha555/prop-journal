"use client";
// 交易頁：匯入區 + 表格 + 右側 journal 欄
import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import ErrorBar from "@/components/ui/ErrorBar";
import Empty from "@/components/ui/Empty";
import JournalDrawer from "@/components/JournalDrawer";
import { apiGet, apiUpload, errorMessage, filterQuery } from "@/lib/api";
import { fmtMoney, fmtNyTime, fmtR, pnlColor, SESSION_LABEL } from "@/lib/format";
import type { ImportResult, Trade } from "@/lib/types";
import { useAppStore, useEnsureAccounts } from "@/store";
import { useLoader } from "@/lib/useLoader";

export default function TradesView() {
  const params = useSearchParams();
  const { accounts, loadAccounts } = useAppStore();
  const accErr = useEnsureAccounts();
  const [notice, setNotice] = useState<string | null>(null);
  const [filterAccount, setFilterAccount] = useState<number | null>(null);
  const [missingOnly, setMissingOnly] = useState(params.get("missing_r") === "1");
  const [importName, setImportName] = useState("");
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Trade | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // 匯入帳戶名：沒打就預設第一個進行中的帳戶；打新名字後端會自動建
  const importAccount = importName || ((accounts.find((a) => a.status === "active") ?? accounts[0])?.name ?? "");

  const { data: trades, setData: setTrades, error: err, setError: setErr, reload: load } = useLoader(() => {
    const q = filterQuery({ account_id: filterAccount });
    const qs = missingOnly ? (q ? `${q}&missing_r=1` : "?missing_r=1") : q;
    return apiGet<Trade[]>(`/trades${qs}`);
  }, [filterAccount, missingOnly]);

  const onFile = async (file: File | null) => {
    if (!file || !importAccount) return;
    setImporting(true);
    setNotice(null);
    setErr(null);
    try {
      const form = new FormData();
      form.append("account_name", importAccount);
      form.append("file", file);
      const r = await apiUpload<ImportResult>("/trades/import", form);
      setNotice(`匯入到「${r.account.name}」${r.account_created ? "（新帳戶）" : ""}：新增 ${r.added} 筆、略過 ${r.skipped} 筆`);
      if (r.account_created) loadAccounts();
      load();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onSaved = (t: Trade) => {
    setTrades((prev) => prev?.map((x) => (x.id === t.id ? t : x)) ?? prev);
    setSelected(t);
  };

  const accountName = (id: number) => {
    const a = accounts.find((x) => x.id === id);
    return a ? `${a.firm} · ${a.name}` : `#${id}`;
  };

  const missingCount = trades?.filter((t) => t.r_multiple === null && t.symbol_root !== null).length ?? 0;

  return (
    <>
      <PageHeader
        title="交易"
        subtitle={trades ? `${trades.length} 筆 · ${missingCount} 筆未補停損` : "載入中…"}
        actions={
          <>
            <select className="input" value={filterAccount ?? ""} onChange={(e) => setFilterAccount(e.target.value ? Number(e.target.value) : null)}>
              <option value="">全部帳戶</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.firm} · {a.name}</option>
              ))}
            </select>
            <button type="button" className={"btn" + (missingOnly ? " border-gold text-gold" : "")} onClick={() => setMissingOnly((v) => !v)}>
              只看未補停損
            </button>
          </>
        }
      />
      <ErrorBar message={err ?? accErr} onClose={() => setErr(null)} />

      {/* 匯入區 */}
      <div className="card flex items-center gap-3 px-[18px] py-3.5">
        <div className="text-[13px] font-bold text-white">匯入 CSV</div>
        <input className="input w-[180px]" list="account-names" value={importAccount} onChange={(e) => setImportName(e.target.value)} placeholder="帳戶名，例 50K Combine" />
        <datalist id="account-names">
          {accounts.map((a) => (
            <option key={a.id} value={a.name} />
          ))}
        </datalist>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <button type="button" className="btn btn-primary" disabled={importing || !importAccount} onClick={() => fileRef.current?.click()}>
          {importing ? "匯入中…" : "選擇 TopstepX CSV"}
        </button>
        <div
          className="flex grow items-center justify-center rounded-lg border border-dashed border-line px-3 py-2 text-[12px] font-semibold text-faint"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0] ?? null);
          }}
        >
          或把 CSV 拖到這裡
        </div>
        {notice && <div className="text-[12px] font-semibold text-green">{notice}</div>}
      </div>

      <div className="flex items-start gap-3">
        {/* 表格 */}
        <div className="card grow overflow-x-auto px-[18px] py-3">
          <table className="w-full border-collapse text-[12px] font-semibold">
            <thead>
              <tr className="th border-b border-line text-left">
                <th className="py-1.5 pr-2 font-bold">時間（NY）</th>
                {filterAccount === null && <th className="py-1.5 pr-2 font-bold">帳戶</th>}
                <th className="py-1.5 pr-2 font-bold">合約</th>
                <th className="py-1.5 pr-2 font-bold">方向</th>
                <th className="py-1.5 pr-2 font-bold">時段</th>
                <th className="py-1.5 pr-2 text-right font-bold">P&L</th>
                <th className="py-1.5 pr-2 text-right font-bold">停損</th>
                <th className="py-1.5 pr-2 text-right font-bold">R</th>
                <th className="py-1.5 font-bold">Setup</th>
              </tr>
            </thead>
            <tbody className="num">
              {trades?.map((t) => {
                const missing = t.r_multiple === null;
                const active = selected?.id === t.id;
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={
                      "cursor-pointer border-b border-line/60 hover:bg-line/40 " +
                      (active ? "bg-line/60" : "")
                    }
                  >
                    <td className="py-2 pr-2 whitespace-nowrap">{fmtNyTime(t.entry_time)}</td>
                    {filterAccount === null && <td className="py-2 pr-2 whitespace-nowrap text-muted">{accountName(t.account_id)}</td>}
                    <td className="py-2 pr-2 whitespace-nowrap">
                      {t.contract} ×{t.size}
                      {t.symbol_root === null && <span className="ml-1.5 text-[11px] text-gold">未知合約</span>}
                    </td>
                    <td className={"py-2 pr-2 " + (t.direction === "long" ? "text-green" : "text-red")}>{t.direction === "long" ? "多" : "空"}</td>
                    <td className="py-2 pr-2 text-muted">{t.session ? SESSION_LABEL[t.session] : "—"}</td>
                    <td className={`py-2 pr-2 text-right ${pnlColor(t.pnl)}`}>{fmtMoney(t.pnl, { sign: true, decimals: 2 })}</td>
                    <td className="py-2 pr-2 text-right">{t.planned_stop_pts ?? <span className="text-gold">待補</span>}</td>
                    <td className={`py-2 pr-2 text-right ${missing ? "text-faint" : pnlColor(t.r_multiple)}`}>{fmtR(t.r_multiple)}</td>
                    <td className="py-2 text-muted">{t.setup ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {trades && trades.length === 0 && <Empty>沒有交易，先匯入 CSV</Empty>}
        </div>

        <JournalDrawer key={selected?.id ?? "none"} trade={selected} onClose={() => setSelected(null)} onSaved={onSaved} />
      </div>
    </>
  );
}
