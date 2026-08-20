"use client";
// 抓資料的共用 hook：掛載與 deps 變動時自動抓，reload() 手動重抓
import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";

export function useLoader<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);

  // 每次 render 後更新 ref，抓資料的 effect 排在後面所以拿到的是最新版
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    fetcherRef
      .current()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
    // deps 由呼叫端決定，tick 用來手動重抓
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  return { data, setData, error, setError, reload };
}
