from datetime import datetime

from fastapi import APIRouter, Depends

from ..db import get_conn
from ..models import Filters
from ..sessions import NY
from ..stats import consistency, performance, sessions
from ..stats.common import best_day_pct, daily_summary, equity_curve
from ..trades_core import fetch_trades

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats/performance")
def stats_performance(f: Filters = Depends()):
    with get_conn() as c:
        return performance.compute(fetch_trades(c, f))


@router.get("/stats/sessions")
def stats_sessions(f: Filters = Depends()):
    with get_conn() as c:
        return sessions.compute(fetch_trades(c, f))


@router.get("/stats/consistency")
def stats_consistency(f: Filters = Depends()):
    with get_conn() as c:
        return consistency.compute(fetch_trades(c, f))


@router.get("/stats/calendar")
def stats_calendar(f: Filters = Depends()):
    with get_conn() as c:
        return {"days": daily_summary(fetch_trades(c, f))}


@router.get("/dashboard")
def dashboard():
    with get_conn() as c:
        accounts = [dict(r) for r in c.execute("SELECT * FROM accounts ORDER BY id")]
        trades = fetch_trades(c, Filters())
        expenses = [dict(r) for r in c.execute("SELECT * FROM expenses")]
        last_import = c.execute("SELECT MAX(imported_at) AS t FROM trades").fetchone()["t"]

    by_acc: dict[int, list[dict]] = {a["id"]: [] for a in accounts}
    for t in trades:
        by_acc.setdefault(t["account_id"], []).append(t)

    for a in accounts:
        ts = by_acc.get(a["id"], [])
        pnl = sum(t["pnl"] for t in ts)
        wins = sum(1 for t in ts if t["pnl"] > 0)
        a.update({
            "balance": round(a["starting_balance"] + pnl, 2),
            "pnl": round(pnl, 2),
            "win_rate": round(wins / len(ts) * 100, 1) if ts else None,
            "trade_count": len(ts),
            "best_day_pct": best_day_pct(ts),
            "last_trade_at": max((t["exit_time"] for t in ts), default=None),
        })

    spent = sum(e["amount"] for e in expenses if e["kind"] != "payout")
    monthly = sum(e["amount"] for e in expenses if e["kind"] == "subscription")
    paid_out = sum(e["amount"] for e in expenses if e["kind"] == "payout")

    this_month = datetime.now(NY).strftime("%Y-%m")
    month_trades = [t for t in trades if t["ny_date"].startswith(this_month)]
    mc = consistency.compute(month_trades)

    return {
        "accounts": accounts,
        "totals": {"spent": round(spent, 2), "monthly_recurring": round(monthly, 2),
                   "paid_out": round(paid_out, 2), "net": round(paid_out - spent, 2)},
        "equity": equity_curve(trades),
        "month": {"expectancy_r": mc["expectancy_r"], "sqn": mc["sqn"], "sqn_grade": mc["sqn_grade"],
                  "blown_r_count": len(mc["blown_r"]),
                  "missing_r_count": mc["r_coverage"]["total"] - mc["r_coverage"]["with_r"]},
        "last_import_at": last_import,
    }
