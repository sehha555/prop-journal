// Zustand：只放跨頁共用的 accounts / setups / stats 篩選條件
import { useEffect, useState } from "react";
import { create } from "zustand";
import { apiGet, apiSend, errorMessage } from "@/lib/api";
import type { Account, Setup, StatsFilter } from "@/lib/types";

interface AppState {
  accounts: Account[];
  accountsLoaded: boolean;
  loadAccounts: () => Promise<void>;
  setups: Setup[];
  setupsLoaded: boolean;
  loadSetups: () => Promise<void>;
  addSetup: (name: string) => Promise<Setup>;
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

  setups: [],
  setupsLoaded: false,
  loadSetups: async () => {
    const setups = await apiGet<Setup[]>("/setups");
    set({ setups, setupsLoaded: true });
  },
  addSetup: async (name: string) => {
    const created = await apiSend<Setup>("POST", "/setups", { name, description: null });
    set({ setups: [...get().setups, created] });
    return created;
  },

  filter: { account_id: null, date_from: "", date_to: "", symbol_root: "" },
  setFilter: (patch) => set({ filter: { ...get().filter, ...patch } }),
}));

// 確保 accounts / setups 載入過一次，回傳載入錯誤訊息（頁面合併進 ErrorBar）
export function useEnsureAccounts(): string | null {
  const { accountsLoaded, loadAccounts } = useAppStore();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!accountsLoaded) loadAccounts().catch((e) => setErr(errorMessage(e)));
  }, [accountsLoaded, loadAccounts]);
  return err;
}

export function useEnsureSetups(): string | null {
  const { setupsLoaded, loadSetups } = useAppStore();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!setupsLoaded) loadSetups().catch((e) => setErr(errorMessage(e)));
  }, [setupsLoaded, loadSetups]);
  return err;
}
