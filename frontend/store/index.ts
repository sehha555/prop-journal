// Zustand：只放跨頁共用的 accounts / stats 篩選條件
import { useEffect, useState } from "react";
import { create } from "zustand";
import { apiGet, errorMessage } from "@/lib/api";
import type { Account, StatsFilter } from "@/lib/types";

interface AppState {
  accounts: Account[];
  accountsLoaded: boolean;
  loadAccounts: () => Promise<void>;
  filter: StatsFilter;
  setFilter: (patch: Partial<StatsFilter>) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  accounts: [],
  accountsLoaded: false,
  loadAccounts: async () => {
    const accounts = await apiGet<Account[]>("/accounts");
    set({ accounts, accountsLoaded: true });
  },

  filter: { account_id: null, date_from: "", date_to: "", symbol_root: "" },
  setFilter: (patch) => set({ filter: { ...get().filter, ...patch } }),
}));

// 確保 accounts 載入過一次，回傳載入錯誤訊息（頁面合併進 ErrorBar）
export function useEnsureAccounts(): string | null {
  const { accountsLoaded, loadAccounts } = useAppStore();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!accountsLoaded) loadAccounts().catch((e) => setErr(errorMessage(e)));
  }, [accountsLoaded, loadAccounts]);
  return err;
}
