import pytest
from fastapi.testclient import TestClient

from app import db


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    """測試不抓 Yahoo K 棒：匯入後的自動補持倉過程一律拿不到資料"""
    from app import excursion
    monkeypatch.setattr(excursion, "fetch_bars", lambda *a, **k: [])
    monkeypatch.setattr(excursion, "pick_interval", lambda start, now=None: "1m")


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "t.db")
    db.init_db()
    from app.main import app
    return TestClient(app)


@pytest.fixture
def account(client):
    r = client.post("/api/accounts", json={"firm": "Topstep", "name": "50K Combine", "kind": "eval",
                                           "starting_balance": 50000, "profit_target": 3000})
    assert r.status_code == 200
    return r.json()
