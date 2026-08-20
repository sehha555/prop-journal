"""accounts / expenses / certificates / setups 的簡單 CRUD 共用寫法。"""

from fastapi import HTTPException

from ..db import get_conn


def list_rows(table: str, order: str = "id") -> list[dict]:
    with get_conn() as c:
        return [dict(r) for r in c.execute(f"SELECT * FROM {table} ORDER BY {order}")]


def get_row(table: str, row_id: int) -> dict:
    with get_conn() as c:
        r = c.execute(f"SELECT * FROM {table} WHERE id=?", (row_id,)).fetchone()
    if not r:
        raise HTTPException(404, f"{table} {row_id} 不存在")
    return dict(r)


def insert_row(table: str, data: dict) -> dict:
    cols = ", ".join(data)
    marks = ", ".join("?" for _ in data)
    with get_conn() as c:
        cur = c.execute(f"INSERT INTO {table} ({cols}) VALUES ({marks})", list(data.values()))
        return dict(c.execute(f"SELECT * FROM {table} WHERE id=?", (cur.lastrowid,)).fetchone())


def patch_row(table: str, row_id: int, data: dict) -> dict:
    data = {k: v for k, v in data.items() if v is not None}
    if data:
        sets = ", ".join(f"{k}=?" for k in data)
        with get_conn() as c:
            c.execute(f"UPDATE {table} SET {sets} WHERE id=?", [*data.values(), row_id])
    return get_row(table, row_id)


def delete_row(table: str, row_id: int) -> dict:
    get_row(table, row_id)
    with get_conn() as c:
        c.execute(f"DELETE FROM {table} WHERE id=?", (row_id,))
    return {"ok": True}
