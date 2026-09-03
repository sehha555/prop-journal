"""A 基本績效。"""

from .common import best_day_pct, daily_pnl, equity_curve, mean, r_coverage

BE_USD = 10.0  # 損益絕對值在這以內算保本出場（使用者推保本後被掃通常正負 10 美元）


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
    mfe_capture_pct = 獲利單實拿點數 / 最多曾賺，看是否常把浮盈吐回去（只算獲利單）。"""
    mfe = [t["mfe_pts"] for t in trades if t["mfe_pts"] is not None]
    mae = [t["mae_pts"] for t in trades if t["mae_pts"] is not None]
    caps = [pnl_pts(t) / t["mfe_pts"] for t in trades if t["mfe_pts"] and pnl_pts(t) > 0]
    # 保本出場：損益在正負 BE_USD 美元內就當作推保本後被掃。附那些交易原本的平均 MFE，看推 BE 是否推太早
    be = [t for t in trades if abs(t["pnl"]) <= BE_USD]
    be_mfe = [t["mfe_pts"] for t in be if t["mfe_pts"] is not None]
    per_trade = [
        {"id": t["id"], "exit_time": t["exit_time"], "contract": t["contract"], "direction": t["direction"],
         "mfe": t["mfe_pts"], "mae": t["mae_pts"], "got": round(pnl_pts(t), 2)}
        for t in trades if t["mfe_pts"] is not None and t["mae_pts"] is not None
    ]
    return {
        "trades": per_trade,
        "be_count": len(be),
        "be_avg_mfe_pts": round(mean(be_mfe), 2) if be_mfe else None,
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
        "daily": [{"date": d, "pnl": round(v, 2)} for d, v in daily_pnl(trades).items()],
    }
