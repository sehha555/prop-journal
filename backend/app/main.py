"""FastAPI 入口。正式模式同時 serve frontend/out 靜態檔。"""

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .db import get_conn, init_db
from .routers import accounts, misc, stats, trades
from .trades_core import recompute

if getattr(sys, "frozen", False):
    FRONTEND_OUT = Path(sys._MEIPASS) / "frontend_out"  # 打包時由 build.spec 塞進來
else:
    FRONTEND_OUT = Path(__file__).resolve().parents[2] / "frontend" / "out"

app = FastAPI(title="prop-journal")
init_db()
# 時段表（sessions.py）改過時，舊交易的 session 要跟著重算；資料量小，每次啟動掃一遍
with get_conn() as _c:
    for _r in _c.execute("SELECT id FROM trades").fetchall():
        recompute(_c, _r["id"])

app.include_router(accounts.router)
app.include_router(trades.router)
app.include_router(misc.router)
app.include_router(stats.router)

if FRONTEND_OUT.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_OUT, html=True), name="frontend")
