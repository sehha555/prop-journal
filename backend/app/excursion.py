"""用真實 K 棒算每筆交易的持倉過程：最多曾賺（MFE）/ 最多曾賠（MAE），單位點、皆為正數。

K 棒來源 Yahoo Finance（yfinance，免帳號）：1 分 K 只留最近 7 天、5 分 K 留 60 天，更早的抓不到、維持手動填。
"""

import sqlite3
from datetime import datetime, timedelta, timezone

from .trades_core import parse_iso

TICKER = {"MNQ": "MNQ=F", "NQ": "NQ=F", "ES": "ES=F", "MES": "MES=F"}


def pick_interval(start: datetime, now: datetime | None = None) -> str | None:
    """Yahoo 的資料保留期：7 天內 1m、60 天內 5m、更早沒有"""
    now = now or datetime.now(timezone.utc)
    age = now - start
    if age < timedelta(days=7):
        return "1m"
    if age < timedelta(days=59):
        return "5m"
    return None


def fetch_bars(root: str, start: datetime, end: datetime, interval: str):
    """回傳 [(bar_start_utc, high, low)]，時間由早到晚。抓不到回 []。"""
    import yfinance as yf

    df = yf.download(TICKER[root], start=start - timedelta(minutes=10), end=end + timedelta(minutes=10),
                     interval=interval, progress=False, auto_adjust=False)
    if df is None or df.empty:
        return []
    hi, lo = df["High"], df["Low"]
    if hasattr(hi, "columns"):  # 多層欄位（新版 yfinance）
        hi, lo = hi.iloc[:, 0], lo.iloc[:, 0]
    idx = df.index.tz_convert("UTC") if df.index.tz is not None else df.index.tz_localize("UTC")
    return [(t.to_pydatetime(), float(h), float(l)) for t, h, l in zip(idx, hi, lo) if h == h and l == l]


def compute(bars, entry_time: datetime, exit_time: datetime, entry_price: float, direction: str,
            bar_minutes: int) -> tuple[float, float] | None:
    """從進場到出場之間的 K 棒取最高最低。含進場那根（bar 起點 <= 進場 < bar 終點）。沒有任何 K 棒回 None。"""
    span = timedelta(minutes=bar_minutes)
    inside = [(h, l) for t, h, l in bars if t + span > entry_time and t <= exit_time]
    if not inside:
        return None
    hi = max(h for h, _ in inside)
    lo = min(l for _, l in inside)
    if direction == "long":
        mfe, mae = hi - entry_price, entry_price - lo
    else:
        mfe, mae = entry_price - lo, hi - entry_price
    return round(max(mfe, 0), 2), round(max(mae, 0), 2)


def fill(conn: sqlite3.Connection, trade_ids: list[int] | None = None, force: bool = False,
         fetch=None) -> dict:
    """補交易的 mfe_pts / mae_pts。預設只補空的；force=True 連已填的（含手動）一起覆蓋。
    同商品同 K 棒週期只抓一次，回 {updated, no_data, unknown_symbol}。"""
    fetch = fetch or fetch_bars  # 執行時才取，測試才能換掉
    sql = "SELECT * FROM trades WHERE symbol_root IS NOT NULL"
    params: list = []
    if not force:
        sql += " AND (mfe_pts IS NULL OR mae_pts IS NULL)"
    if trade_ids:
        sql += f" AND id IN ({','.join('?' * len(trade_ids))})"
        params += trade_ids
    rows = [dict(r) for r in conn.execute(sql, params)]
    unknown = conn.execute("SELECT COUNT(*) FROM trades WHERE symbol_root IS NULL").fetchone()[0]

    groups: dict[tuple[str, str], list[dict]] = {}
    no_data = 0
    for r in rows:
        interval = pick_interval(parse_iso(r["entry_time"]))
        if r["symbol_root"] not in TICKER or interval is None:
            no_data += 1
            continue
        groups.setdefault((r["symbol_root"], interval), []).append(r)

    updated = 0
    for (root, interval), trs in groups.items():
        start = min(parse_iso(t["entry_time"]) for t in trs)
        end = max(parse_iso(t["exit_time"]) for t in trs)
        bars = fetch(root, start, end, interval)
        minutes = int(interval.rstrip("m"))
        for t in trs:
            res = compute(bars, parse_iso(t["entry_time"]), parse_iso(t["exit_time"]),
                          t["entry_price"], t["direction"], minutes)
            if res is None:
                no_data += 1
                continue
            conn.execute("UPDATE trades SET mfe_pts=?, mae_pts=? WHERE id=?", (res[0], res[1], t["id"]))
            updated += 1
    return {"updated": updated, "no_data": no_data, "unknown_symbol": unknown}
