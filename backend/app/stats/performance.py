"""A 基本績效。"""

from .common import best_day_pct, equity_curve, mean, r_coverage


def max_drawdown(equity: list[dict]) -> float:
    peak, dd = 0.0, 0.0
    for p in equity:
        peak = max(peak, p["cum_pnl"])
        dd = max(dd, peak - p["cum_pnl"])
    return round(dd, 2)


def compute(trades: list[dict]) -> dict:
    wins = [t["pnl"] for t in trades if t["pnl"] > 0]
    losses = [t["pnl"] for t in trades if t["pnl"] < 0]
    gross_win, gross_loss = sum(wins), -sum(losses)
    eq = equity_curve(trades)
    return {
        "r_coverage": r_coverage(trades),
        "total_pnl": round(sum(t["pnl"] for t in trades), 2),
        "trade_count": len(trades),
        "win_rate": round(len(wins) / len(trades) * 100, 1) if trades else None,
        "profit_factor": round(gross_win / gross_loss, 2) if gross_loss else None,
        "avg_win": round(mean(wins), 2) if wins else None,
        "avg_loss": round(mean(losses), 2) if losses else None,
        "max_win": max(wins) if wins else None,
        "max_loss": min(losses) if losses else None,
        "max_drawdown": max_drawdown(eq),
        "best_day_pct": best_day_pct(trades),
        "equity": eq,
    }
