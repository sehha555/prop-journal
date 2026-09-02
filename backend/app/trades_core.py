"""交易的推導欄位與查詢。routers 與 stats 都從這裡拿資料。"""

import sqlite3
import uuid
from datetime import datetime, timezone

from .contracts import POINT_VALUE, symbol_root
from .models import Filters, TradeIn
from .sessions import ny_date, session_of


def parse_iso(s: str) -> datetime:
    dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


# 使用者的停損習慣：每筆抓 250 美元。虧損單直接用實際賠的金額當停損（會多一點少一點），
# 獲利單和只小賠的單（賠不到一半，通常是推保本後掃出）用 250 算。
DEFAULT_RISK_USD = 250.0


def auto_stop_pts(contract: str, size: int, pnl: float) -> float | None:
    """沒填計畫停損時自動推：金額 ÷（口數 × 點值）。不認得的商品回 None。"""
    root = symbol_root(contract)
    if not root or size <= 0:
        return None
    risk = -pnl if pnl < 0 and -pnl >= DEFAULT_RISK_USD / 2 else DEFAULT_RISK_USD
    return round(risk / (POINT_VALUE[root] * size), 2)


def derive(contract: str, size: int, pnl: float, planned_stop_pts, entry_time: str) -> dict:
    root = symbol_root(contract)
    risk = r = None
    if root and planned_stop_pts:
        risk = planned_stop_pts * POINT_VALUE[root] * size
        r = pnl / risk if risk else None
    return {
        "symbol_root": root,
        "risk_usd": risk,
        "r_multiple": r,
        "session": session_of(parse_iso(entry_time)),
    }


def insert_trade(conn: sqlite3.Connection, t: TradeIn) -> int | None:
    """回傳新 id；(account_id, external_id) 已存在回 None。"""
    ext = t.external_id or uuid.uuid4().hex
    if t.planned_stop_pts is None:
        t.planned_stop_pts = auto_stop_pts(t.contract, t.size, t.pnl)
    d = derive(t.contract, t.size, t.pnl, t.planned_stop_pts, t.entry_time)
    try:
        cur = conn.execute(
            """INSERT INTO trades (account_id, external_id, contract, symbol_root, direction, size,
               entry_time, exit_time, entry_price, exit_price, pnl, commissions, fees,
               planned_stop_pts, mfe_pts, mae_pts, moved_to_be, setup, note, risk_usd, r_multiple, session)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (t.account_id, ext, t.contract.upper(), d["symbol_root"], t.direction, t.size,
             parse_iso(t.entry_time).isoformat(), parse_iso(t.exit_time).isoformat(),
             t.entry_price, t.exit_price, t.pnl, t.commissions, t.fees,
             t.planned_stop_pts, t.mfe_pts, t.mae_pts, int(t.moved_to_be), t.setup, t.note, d["risk_usd"], d["r_multiple"], d["session"]),
        )
    except sqlite3.IntegrityError:
        return None
    return cur.lastrowid


def recompute(conn: sqlite3.Connection, trade_id: int) -> None:
    row = conn.execute("SELECT * FROM trades WHERE id=?", (trade_id,)).fetchone()
    d = derive(row["contract"], row["size"], row["pnl"], row["planned_stop_pts"], row["entry_time"])
    conn.execute(
        "UPDATE trades SET symbol_root=?, risk_usd=?, r_multiple=?, session=? WHERE id=?",
        (d["symbol_root"], d["risk_usd"], d["r_multiple"], d["session"], trade_id),
    )


def where_clause(f: Filters) -> tuple[str, list]:
    """篩選轉 SQL。日期比的是紐約日期，所以先把 UTC exit_time 撈出來再用 python 過濾會更準，
    但資料量小，這裡直接在 SQL 用 UTC 日期粗篩、再在 python 精篩。"""
    conds, params = [], []
    if f.account_id:
        conds.append("account_id=?")
        params.append(f.account_id)
    if f.symbol_root:
        conds.append("symbol_root=?")
        params.append(f.symbol_root.upper())
    sql = (" WHERE " + " AND ".join(conds)) if conds else ""
    return sql, params


def fetch_trades(conn: sqlite3.Connection, f: Filters, missing_r: bool = False) -> list[dict]:
    sql, params = where_clause(f)
    if missing_r:
        sql += (" AND " if sql else " WHERE ") + "r_multiple IS NULL"
    rows = [dict(r) for r in conn.execute(f"SELECT * FROM trades{sql} ORDER BY exit_time", params)]
    if f.date_from or f.date_to:
        out = []
        for r in rows:
            d = ny_date(parse_iso(r["exit_time"]))
            if f.date_from and d < f.date_from:
                continue
            if f.date_to and d > f.date_to:
                continue
            out.append(r)
        rows = out
    for r in rows:
        r["ny_date"] = ny_date(parse_iso(r["exit_time"]))
    return rows
