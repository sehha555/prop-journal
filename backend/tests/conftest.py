import pytest
from fastapi.testclient import TestClient

from app import db


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
