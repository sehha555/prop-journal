import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from ..db import get_conn
from ..importers import KNOWN_IMPORTERS, detect_importer, read_csv
from ..models import Filters, TradeIn, TradePatch
from ..trades_core import fetch_trades, insert_trade, recompute
from . import crud

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.get("")
def list_trades(f: Filters = Depends(), missing_r: int = 0):
    with get_conn() as c:
        return fetch_trades(c, f, missing_r=bool(missing_r))


@router.post("")
def create_trade(body: TradeIn):
    crud.get_row("accounts", body.account_id)
    with get_conn() as c:
        new_id = insert_trade(c, body)
        if new_id is None:
            raise HTTPException(409, "同帳戶已有相同 external_id 的交易")
        return dict(c.execute("SELECT * FROM trades WHERE id=?", (new_id,)).fetchone())


@router.patch("/{trade_id}")
def patch_trade(trade_id: int, body: TradePatch):
    crud.patch_row("trades", trade_id, body.model_dump())
    with get_conn() as c:
        recompute(c, trade_id)
        return dict(c.execute("SELECT * FROM trades WHERE id=?", (trade_id,)).fetchone())


@router.delete("/{trade_id}")
def delete_trade(trade_id: int):
    return crud.delete_row("trades", trade_id)


def infer_account(name: str) -> dict:
    """從帳號名推 Topstep 規格：50K → 起始 50,000 / 目標 3,000；100K → 6,000；150K → 9,000。推不出用 50K。"""
    m = re.search(r"(\d+)\s*K", name, re.IGNORECASE)
    size = int(m.group(1)) * 1000 if m else 50000
    return {"firm": "Topstep", "name": name, "kind": "eval", "starting_balance": size,
            "profit_target": size * 0.06}


@router.post("/import")
async def import_csv(account_name: str = Form(...), file: UploadFile = File(...)):
    """CSV 沒帳號欄，帳戶由使用者打名字；同名（不分大小寫）就疊加，沒有就自動建。"""
    name = account_name.strip()
    if not name:
        raise HTTPException(400, "請填帳戶名")
    with get_conn() as c:
        row = c.execute("SELECT * FROM accounts WHERE lower(name)=lower(?)", (name,)).fetchone()
    created = row is None
    account = crud.insert_row("accounts", infer_account(name)) if created else dict(row)
    account_id = account["id"]
    headers, rows = read_csv(await file.read())
    imp = detect_importer(headers)
    if imp is None:
        raise HTTPException(400, {"detail": "認不出這個 CSV 的格式", "headers": headers,
                                  "known_importers": [i.name for i in KNOWN_IMPORTERS]})
    try:
        trades = imp.parse(rows, account_id)
    except ValueError as e:
        raise HTTPException(400, {"detail": str(e), "known_importers": [imp.name]})
    added = skipped = 0
    with get_conn() as c:
        for t in trades:
            if insert_trade(c, t) is None:
                skipped += 1
            else:
                added += 1
    return {"added": added, "skipped": skipped, "importer": imp.name,
            "account": account, "account_created": created}
