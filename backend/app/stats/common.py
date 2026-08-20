"""統計共用小工具。"""

import math
from collections import defaultdict


def mean(xs: list[float]) -> float | None:
    return sum(xs) / len(xs) if xs else None


def std(xs: list[float]) -> float | None:
    """樣本標準差（n-1）。少於 2 筆回 None。"""
    if len(xs) < 2:
        return None
    m = sum(xs) / len(xs)
    return math.sqrt(sum((x - m) ** 2 for x in xs) / (len(xs) - 1))


def r_coverage(trades: list[dict]) -> dict:
    return {"total": len(trades), "with_r": sum(1 for t in trades if t["r_multiple"] is not None)}


def with_r(trades: list[dict]) -> list[dict]:
    return [t for t in trades if t["r_multiple"] is not None]


def daily_pnl(trades: list[dict]) -> dict[str, float]:
    d: dict[str, float] = defaultdict(float)
    for t in trades:
        d[t["ny_date"]] += t["pnl"]
    return dict(sorted(d.items()))


def equity_curve(trades: list[dict]) -> list[dict]:
    cum = 0.0
    out = []
    for day, pnl in daily_pnl(trades).items():
        cum += pnl
        out.append({"date": day, "cum_pnl": round(cum, 2)})
    return out


def best_day_pct(trades: list[dict]) -> float | None:
    """單日最佳獲利佔總獲利 %（Topstep 出金規則）。總獲利 <= 0 回 None。"""
    days = daily_pnl(trades)
    total = sum(days.values())
    if total <= 0 or not days:
        return None
    return round(max(days.values()) / total * 100, 1)


def slice_stats(trades: list[dict]) -> dict:
    wins = [t["pnl"] for t in trades if t["pnl"] > 0]
    rs = [t["r_multiple"] for t in with_r(trades)]
    return {
        "trade_count": len(trades),
        "win_rate": round(len(wins) / len(trades) * 100, 1) if trades else None,
        "pnl": round(sum(t["pnl"] for t in trades), 2),
        "avg_r": round(mean(rs), 2) if rs else None,
    }
