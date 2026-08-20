// 統一的 fetch 包裝：相對路徑 /api，錯誤轉成 Error 讓頁面顯示紅字
import type { StatsFilter } from "./types";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) {
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  let message = `${res.status} ${res.statusText}`;
  let detail: unknown;
  try {
    const body = await res.json();
    detail = body;
    if (typeof body?.detail === "string") message = body.detail;
    else if (body?.detail) message = JSON.stringify(body.detail);
  } catch {
    // 非 JSON 回應就保留狀態碼
  }
  throw new ApiError(res.status, message, detail);
}

export function apiGet<T>(path: string): Promise<T> {
  return fetch(`/api${path}`, { cache: "no-store" }).then((r) => handle<T>(r));
}

export function apiSend<T>(method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  return fetch(`/api${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then((r) => handle<T>(r));
}

export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return fetch(`/api${path}`, { method: "POST", body: form }).then((r) => handle<T>(r));
}

// 共用篩選 query string（stats / trades 都吃）
export function filterQuery(f: Partial<StatsFilter>): string {
  const p = new URLSearchParams();
  if (f.account_id) p.set("account_id", String(f.account_id));
  if (f.date_from) p.set("date_from", f.date_from);
  if (f.date_to) p.set("date_to", f.date_to);
  if (f.symbol_root) p.set("symbol_root", f.symbol_root);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
