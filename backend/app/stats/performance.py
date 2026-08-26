"""A 基本績效。"""

from .common import best_day_pct, equity_curve, mean, r_coverage


def max_drawdown(equity: list[dict]) -> float:
    peak, dd = 0.0, 0.0
    for p in equity:
        peak = max(peak, p["cum_pnl"])
        dd = max(dd, peak - p["cum_pnl"])
    return round(dd, 2)


def pnl_pts(t: dict) -> float:
    d = t["exit_price"] - t["entry_price"]
    return d if t["direction"] == "long" else -d


def excursion(trades: list[dict]) -> dict:
    """MFE / MAE（點）。只算有填的交易；不同合約點數不通用，篩單一 symbol 看才準。
    mfe_capture_pct = 實際拿到的點數 / 最大浮盈，看是否常把浮盈吐回去。"""
    mfe = [t["mfe_pts"] for t in trades if t["mfe_pts"] is not None]
    mae = [t["mae_pts"] for t in trades if t["mae_pts"] is not None]
    caps = [pnl_pts(t) / t["mfe_pts"] for t in trades if t["mfe_pts"]]
    return {
        "with_mfe": len(mfe),
        "with_mae": len(mae),
        "avg_mfe_pts": round(mean(mfe), 2) if mfe else None,
        "avg_mae_pts": round(mean(mae), 2) if mae else None,
        "max_mae_pts": max(mae) if mae else None,
        "mfe_capture_pct": round(mean(caps) * 100, 1) if caps else None,
    }


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
        "excursion": excursion(trades),
        "equity": eq,
    }
