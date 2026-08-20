"""FastAPI 入口。正式模式同時 serve frontend/out 靜態檔。"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .db import init_db
from .routers import accounts, misc, stats, trades

FRONTEND_OUT = Path(__file__).resolve().parents[2] / "frontend" / "out"

app = FastAPI(title="prop-journal")
init_db()

app.include_router(accounts.router)
app.include_router(trades.router)
app.include_router(misc.router)
app.include_router(stats.router)

if FRONTEND_OUT.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_OUT, html=True), name="frontend")
