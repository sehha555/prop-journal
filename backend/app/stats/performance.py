"""A 基本績效。"""

from ..trades_core import DEFAULT_RISK_USD, parse_iso
from .common import best_day_pct, daily_pnl, equity_curve, mean, r_coverage



def max_drawdown(equity: list[dict]) -> float:
    peak, dd = 0.0, 0.0
    for p in equity:
        peak = max(peak, p["cum_pnl"])
        dd = max(dd, peak - p["cum_pnl"])
    return round(dd, 2)


def pnl_pts(t: dict) -> float:
    d = t["exit_price"] - t["entry_price"]
    return d if t["direction"] == "long" else -d


def is_be(t: dict) -> bool:
    risk = t["risk_usd"] or DEFAULT_RISK_USD
    return t["pnl"] <= 0 and -t["pnl"] < risk / 2


def excursion(trades: list[dict]) -> dict:
    """MFE / MAE（點）。只算有填的交易；不同合約點數不通用，篩單一 symbol 看才準。
    mfe_capture_pct = 獲利單實拿點數 / 最多曾賺，看是否常把浮盈吐回去（只算獲利單）。"""
    mfe = [t["mfe_pts"] for t in trades if t["mfe_pts"] is not None]
    mae = [t["mae_pts"] for t in trades if t["mae_pts"] is not None]
    caps = [pnl_pts(t) / t["mfe_pts"] for t in trades if t["mfe_pts"] and pnl_pts(t) > 0]
    # 保本出場：只小賠（賠不到計畫風險一半，停損 400 就是賠 200 內）當作推保本後被掃，
    # 跟 trades_core.auto_stop_pts 同一條線。賺的不算：移動停損可能鎖到 1R、2R，分不出是不是 BE。
    # 附那些交易原本的平均 MFE，看推 BE 是否推太早
    be = [t for t in trades if is_be(t)]
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


def positions(trades: list[dict]) -> list[dict]:
    """把同一次進出合成一筆：同帳戶、同方向，進場時部位還沒出清（早於這組最晚的出場）就併進去。
    分批加碼、部分停利都算同一筆，全部平倉才結束。
    回 {pnl, size, pts}，pts 是依口數加權的平均點數（賺正賠負）。"""
    out: list[dict] = []
    for t in sorted(trades, key=lambda t: (t["account_id"], t["entry_time"])):
        entry, exit = parse_iso(t["entry_time"]), parse_iso(t["exit_time"])
        last = out[-1] if out else None
        if last and last["key"] == (t["account_id"], t["direction"]) and entry < last["exit"]:
            last["pnl"] += t["pnl"]
            last["pts_x_size"] += pnl_pts(t) * t["size"]
            last["size"] += t["size"]
            last["exit"] = max(last["exit"], exit)
        else:
            out.append({"key": (t["account_id"], t["direction"]), "exit": exit,
                        "pnl": t["pnl"], "size": t["size"], "pts_x_size": pnl_pts(t) * t["size"]})
    return [{"pnl": p["pnl"], "size": p["size"], "pts": p["pts_x_size"] / p["size"]} for p in out]


def raw_summary(trades: list[dict]) -> dict:
    """不靠 R：賺的單、賠的單各自的平均金額 / 點數 / 口數。分批進場先合併。"""
    ps = positions(trades)

    def side(xs: list[dict]) -> dict:
        if not xs:
            return {"count": 0, "avg_usd": None, "avg_pts": None, "avg_size": None, "min_size": None, "max_size": None}
        return {
            "count": len(xs),
            "avg_usd": round(mean([p["pnl"] for p in xs]), 2),
            "avg_pts": round(abs(mean([p["pts"] for p in xs])), 2),
            "avg_size": round(mean([p["size"] for p in xs]), 1),
            "min_size": min(p["size"] for p in xs),
            "max_size": max(p["size"] for p in xs),
        }

    win, loss = side([p for p in ps if p["pnl"] > 0]), side([p for p in ps if p["pnl"] <= 0])
    payoff = round(win["avg_usd"] / -loss["avg_usd"], 2) if win["avg_usd"] and loss["avg_usd"] else None
    return {"positions": len(ps), "win": win, "loss": loss, "payoff": payoff}


def compute(trades: list[dict]) -> dict:
    wins = [t["pnl"] for t in trades if t["pnl"] > 0]
    losses = [t["pnl"] for t in trades if t["pnl"] < 0]
    gross_win, gross_loss = sum(wins), -sum(losses)
    eq = equity_curve(trades)
    tilt = [t["pnl"] for t in trades if t["tilt"]]
    return {
        "tilt_count": len(tilt),
        "tilt_pnl": round(sum(tilt), 2),
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
        "raw": raw_summary(trades),
        "equity": eq,
        "daily": [{"date": d, "pnl": round(v, 2)} for d, v in daily_pnl(trades).items()],
    }
