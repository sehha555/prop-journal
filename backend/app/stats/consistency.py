"""consistency：統計面（edge 真不真）+ 行為面（有沒有照計畫）。"""

import math
from collections import defaultdict

from .common import daily_pnl, mean, r_coverage, std, with_r

BLOWN_R_THRESHOLD = -1.5
ROLLING_WINDOW = 20
REVENGE_AFTER_LOSSES = 2
REVENGE_LOOKBACK = 20

HIST_BUCKETS = ["<-2", "-2", "-1", "0", "+1", "+2", "+3", "+4", "+5>"]


def bucket_of(r: float) -> str:
    if r < -2:
        return "<-2"
    if r >= 5:
        return "+5>"
    k = math.floor(r)
    return f"+{k}" if k > 0 else str(k)


def sqn_grade(sqn: float | None) -> str | None:
    """Van Tharp 分級。"""
    if sqn is None:
        return None
    if sqn < 1.6:
        return "偏弱"
    if sqn < 2.0:
        return "平均"
    if sqn < 2.5:
        return "平均偏上"
    if sqn < 3.0:
        return "好"
    if sqn < 5.0:
        return "很好"
    return "優異"


def rolling_expectancy(rs_trades: list[dict]) -> list[dict]:
    out = []
    for i in range(ROLLING_WINDOW - 1, len(rs_trades)):
        window = rs_trades[i - ROLLING_WINDOW + 1 : i + 1]
        t = rs_trades[i]
        out.append({"trade_id": t["id"], "exit_time": t["exit_time"],
                    "value": round(mean([w["r_multiple"] for w in window]), 3)})
    return out


def revenge_size_ratio(trades: list[dict]) -> float | None:
    """連賠 N 筆後下一筆 size / 前 M 筆平均 size，取所有事件的平均。"""
    ratios = []
    streak = 0
    for i, t in enumerate(trades):
        if streak >= REVENGE_AFTER_LOSSES:
            prev = trades[max(0, i - REVENGE_LOOKBACK) : i]
            base = mean([p["size"] for p in prev])
            if base:
                ratios.append(t["size"] / base)
        streak = streak + 1 if t["pnl"] < 0 else 0
    return round(mean(ratios), 2) if ratios else None


def compute(trades: list[dict]) -> dict:
    rt = with_r(trades)
    rs = [t["r_multiple"] for t in rt]
    exp = mean(rs)
    r_sd = std(rs)
    sqn = round(exp / r_sd * math.sqrt(len(rs)), 2) if (exp is not None and r_sd) else None

    hist = defaultdict(int)
    for r in rs:
        hist[bucket_of(r)] += 1

    setup_groups = defaultdict(list)
    for t in rt:
        if t["setup"]:
            setup_groups[t["setup"]].append(t["r_multiple"])

    days = daily_pnl(trades)
    per_day_count = defaultdict(int)
    for t in trades:
        per_day_count[t["ny_date"]] += 1
    win_days = [per_day_count[d] for d, p in days.items() if p > 0]
    loss_days = [per_day_count[d] for d, p in days.items() if p < 0]
    dvals = list(days.values())

    return {
        "r_coverage": r_coverage(trades),
        "expectancy_r": round(exp, 3) if exp is not None else None,
        "r_std": round(r_sd, 3) if r_sd is not None else None,
        "sqn": sqn,
        "sqn_grade": sqn_grade(sqn),
        "daily_pnl_std": round(std(dvals), 2) if std(dvals) is not None else None,
        "daily_pnl_mean": round(mean(dvals), 2) if dvals else None,
        "r_histogram": [{"bucket": b, "count": hist.get(b, 0)} for b in HIST_BUCKETS],
        "rolling_expectancy": rolling_expectancy(rt),
        "blown_r": [t for t in rt if t["r_multiple"] < BLOWN_R_THRESHOLD],
        "setup_r_std": sorted(
            [{"setup": s, "r_std": round(std(v), 3) if std(v) is not None else None, "trade_count": len(v)}
             for s, v in setup_groups.items()],
            key=lambda x: -x["trade_count"]),
        "avg_trades_win_day": round(mean(win_days), 1) if win_days else None,
        "avg_trades_loss_day": round(mean(loss_days), 1) if loss_days else None,
        "revenge_size_ratio": revenge_size_ratio(trades),
    }
