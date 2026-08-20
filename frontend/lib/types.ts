// 型別完全對應 docs/api.md，不自創欄位

export type AccountKind = "eval" | "funded";
export type AccountStatus = "active" | "passed" | "failed" | "closed";

export interface Account {
  id: number;
  firm: string;
  name: string;
  kind: AccountKind;
  starting_balance: number;
  profit_target: number | null;
  status: AccountStatus;
  created_at: string;
  note: string | null;
}

export type Session = "asia" | "london" | "ny_am" | "ny_pm" | "off";

export interface Trade {
  id: number;
  account_id: number;
  external_id: string | null;
  contract: string;
  symbol_root: string | null;
  direction: "long" | "short";
  size: number;
  entry_time: string;
  exit_time: string;
  entry_price: number;
  exit_price: number;
  pnl: number;
  commissions: number;
  fees: number;
  planned_stop_pts: number | null;
  setup: string | null;
  note: string | null;
  risk_usd: number | null;
  r_multiple: number | null;
  session: Session | null;
}

export type ExpenseKind = "eval" | "reset" | "activation" | "subscription" | "other";

export interface Expense {
  id: number;
  account_id: number | null;
  kind: ExpenseKind;
  amount: number;
  date: string;
  note: string | null;
}

export type CertificateKind = "eval_passed" | "payout";

export interface Certificate {
  id: number;
  account_id: number;
  kind: CertificateKind;
  amount: number | null;
  date: string;
  note: string | null;
}

export interface Setup {
  id: number;
  name: string;
  description: string | null;
}

export interface EquityPoint {
  date: string;
  cum_pnl: number;
}

export interface DashboardAccount extends Account {
  balance: number;
  pnl: number;
  win_rate: number | null;
  trade_count: number;
  best_day_pct: number | null;
  last_trade_at: string | null;
}

export interface Dashboard {
  accounts: DashboardAccount[];
  totals: { spent: number; monthly_recurring: number; paid_out: number; net: number };
  equity: EquityPoint[];
  month: {
    expectancy_r: number | null;
    sqn: number | null;
    blown_r_count: number;
    missing_r_count: number;
  };
  last_import_at: string | null;
}

export interface RCoverage {
  total: number;
  with_r: number;
}

export interface StatsFilter {
  account_id: number | null;
  date_from: string;
  date_to: string;
  symbol_root: string;
}

export interface PerformanceStats {
  r_coverage: RCoverage;
  total_pnl: number;
  trade_count: number;
  win_rate: number | null;
  profit_factor: number | null;
  avg_win: number | null;
  avg_loss: number | null;
  max_win: number | null;
  max_loss: number | null;
  max_drawdown: number | null;
  best_day_pct: number | null;
  equity: EquityPoint[];
}

export interface SliceRow {
  key: string | number;
  label: string;
  trade_count: number;
  win_rate: number | null;
  pnl: number;
  avg_r: number | null;
}

export interface SessionStats {
  r_coverage: RCoverage;
  by_session: SliceRow[];
  by_weekday: SliceRow[];
  by_hour: SliceRow[];
  by_setup: SliceRow[];
}

export interface ConsistencyStats {
  r_coverage: RCoverage;
  expectancy_r: number | null;
  r_std: number | null;
  sqn: number | null;
  sqn_grade: string | null;
  daily_pnl_std: number | null;
  daily_pnl_mean: number | null;
  r_histogram: { bucket: string; count: number }[];
  rolling_expectancy: { trade_id: number; exit_time: string; value: number }[];
  blown_r: Trade[];
  setup_r_std: { setup: string; r_std: number | null; trade_count: number }[];
  avg_trades_win_day: number | null;
  avg_trades_loss_day: number | null;
  revenge_size_ratio: number | null;
}

export interface ImportResult {
  added: number;
  skipped: number;
  importer: string;
}
