"use client";
// 統計頁共用篩選列：帳戶 / 日期區間 / 商品，狀態放 Zustand 跨 tab 共用
import { SYMBOL_ROOTS } from "@/lib/format";
import { useAppStore } from "@/store";

export default function FilterBar() {
  const { accounts, filter, setFilter } = useAppStore();

  return (
    <div className="flex gap-2">
      <select className="input" value={filter.account_id ?? ""} onChange={(e) => setFilter({ account_id: e.target.value ? Number(e.target.value) : null })}>
        <option value="">全部帳戶</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.firm} · {a.name}</option>
        ))}
      </select>
      <input className="input num" type="date" value={filter.date_from} onChange={(e) => setFilter({ date_from: e.target.value })} aria-label="起日" />
      <input className="input num" type="date" value={filter.date_to} onChange={(e) => setFilter({ date_to: e.target.value })} aria-label="迄日" />
      <select className="input" value={filter.symbol_root} onChange={(e) => setFilter({ symbol_root: e.target.value })}>
        <option value="">全部商品</option>
        {SYMBOL_ROOTS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
