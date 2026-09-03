"""SQLite 連線與 schema。stdlib sqlite3，不用 ORM。"""

import sqlite3
import sys
from contextlib import contextmanager
from pathlib import Path

# 打包成 exe（PyInstaller）時，資料放 exe 旁邊，重開或改版都還在
ROOT = Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "journal.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firm TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('eval','funded')),
    starting_balance REAL NOT NULL,
    profit_target REAL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','passed','failed','closed')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note TEXT
);

CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    contract TEXT NOT NULL,
    symbol_root TEXT,
    direction TEXT NOT NULL CHECK (direction IN ('long','short')),
    size INTEGER NOT NULL,
    entry_time TEXT NOT NULL,
    exit_time TEXT NOT NULL,
    entry_price REAL NOT NULL,
    exit_price REAL NOT NULL,
    pnl REAL NOT NULL,
    commissions REAL NOT NULL DEFAULT 0,
    fees REAL NOT NULL DEFAULT 0,
    planned_stop_pts REAL,
    mfe_pts REAL,
    mae_pts REAL,
    setup TEXT,
    note TEXT,
    risk_usd REAL,
    r_multiple REAL,
    session TEXT NOT NULL,
    imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (account_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_trades_account ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_exit ON trades(exit_time);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('eval','reset','activation','subscription','other','payout')),
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    note TEXT
);

CREATE TABLE IF NOT EXISTS setups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);
"""

# 後加的欄位：舊資料庫用 ALTER TABLE 補上（CREATE IF NOT EXISTS 不會動既有表）
ADDED_COLUMNS = [("trades", "mfe_pts", "REAL"), ("trades", "mae_pts", "REAL")]


def init_db(path: Path | None = None) -> None:
    path = path or DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        conn.executescript(SCHEMA)
        for table, col, typ in ADDED_COLUMNS:
            have = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
            if col not in have:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {typ}")


@contextmanager
def get_conn(path: Path | None = None):
    conn = sqlite3.connect(path or DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def rows_to_dicts(rows) -> list[dict]:
    return [dict(r) for r in rows]
