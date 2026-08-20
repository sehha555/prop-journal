// 數字 / 日期顯示的小工具

export function fmtMoney(v: number | null | undefined, opts: { sign?: boolean; decimals?: number } = {}): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const decimals = opts.decimals ?? 0;
  const abs = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (v < 0) return `-$${abs}`;
  return opts.sign ? `+$${abs}` : `$${abs}`;
}

export function fmtSigned(v: number | null | undefined, decimals = 0): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  const s = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return v < 0 ? `-${s}` : `+${s}`;
}

export function fmtR(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)} R`;
}

export function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  // 後端一律回 0-100 的百分比
  return `${Math.round(v)}%`;
}

export function fmtNum(v: number | null | undefined, decimals = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  return v.toFixed(decimals);
}

// ISO UTC → 紐約時間 MM-DD HH:mm
export function fmtNyTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export function fmtLocal(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function pnlColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return "text-fg";
  if (v > 0) return "text-green";
  if (v < 0) return "text-red";
  return "text-fg";
}

export const SESSION_LABEL: Record<string, string> = {
  asia: "Asia",
  london: "London",
  ny_am: "NY AM",
  ny_pm: "NY PM",
  off: "Off-hours",
};

export const STATUS_LABEL: Record<string, string> = {
  active: "進行中",
  passed: "已過關",
  failed: "已失敗",
  closed: "已關閉",
};

export const EXPENSE_KIND_LABEL: Record<string, string> = {
  eval: "評估費",
  reset: "重置費",
  activation: "啟用費",
  subscription: "月費",
  other: "其他",
};

export const SYMBOL_ROOTS = ["NQ", "MNQ", "ES", "MES"];
