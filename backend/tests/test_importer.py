from pathlib import Path

SAMPLE = Path(__file__).parent / "sample_topstepx.csv"


def test_import_and_dedupe(client, account):
    files = {"file": ("t.csv", SAMPLE.read_bytes(), "text/csv")}
    r = client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    assert r.status_code == 200, r.text
    body = r.json()
    assert (body["added"], body["skipped"], body["importer"]) == (3, 0, "topstepx")
    assert body["account_created"] is False and body["account"]["id"] == account["id"]

    r = client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    assert r.json()["added"] == 0 and r.json()["skipped"] == 3

    trades = client.get("/api/trades").json()
    assert len(trades) == 3
    t = trades[0]
    assert t["symbol_root"] == "MNQ" and t["direction"] == "long"
    # 09:35 紐約 = 13:35 UTC
    assert t["entry_time"].startswith("2026-08-19T13:35:10")
    assert t["session"] == "ny_am"
    assert trades[2]["session"] == "asia"  # 20:15 紐約
    assert t["r_multiple"] is None


def test_unknown_csv(client, account):
    files = {"file": ("x.csv", b"a,b,c\n1,2,3\n", "text/csv")}
    r = client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    assert r.status_code == 400
    assert "topstepx" in r.json()["detail"]["known_importers"]


def test_journal_patch_computes_r(client, account):
    files = {"file": ("t.csv", SAMPLE.read_bytes(), "text/csv")}
    client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    t = client.get("/api/trades", params={"missing_r": 1}).json()[0]
    r = client.patch(f"/api/trades/{t['id']}", json={"planned_stop_pts": 10, "setup": "SMT"})
    body = r.json()
    # MNQ 10 點 × $2 × 1 口 = $20 風險，pnl 38.52 → 1.926 R
    assert body["risk_usd"] == 20
    assert round(body["r_multiple"], 3) == 1.926
    assert len(client.get("/api/trades", params={"missing_r": 1}).json()) == 2


def test_mfe_mae_patch_and_stats(client, account):
    files = {"file": ("t.csv", SAMPLE.read_bytes(), "text/csv")}
    client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    t = client.get("/api/trades").json()[0]
    r = client.patch(f"/api/trades/{t['id']}", json={"mfe_pts": 40, "mae_pts": 5})
    assert r.json()["mfe_pts"] == 40 and r.json()["mae_pts"] == 5
    ex = client.get("/api/stats/performance").json()["excursion"]
    assert ex["with_mfe"] == 1 and ex["with_mae"] == 1
    assert ex["avg_mae_pts"] == 5 and ex["max_mae_pts"] == 5
    # 拿到的點數 / 最大浮盈 40 點
    got = (t["exit_price"] - t["entry_price"]) if t["direction"] == "long" else (t["entry_price"] - t["exit_price"])
    assert ex["mfe_capture_pct"] == round(got / 40 * 100, 1)


def test_moved_to_be_stats(client, account):
    files = {"file": ("t.csv", SAMPLE.read_bytes(), "text/csv")}
    client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    trades = client.get("/api/trades").json()
    assert trades[0]["moved_to_be"] == 0
    loser = next(t for t in trades if t["pnl"] < 0)
    client.patch(f"/api/trades/{loser['id']}", json={"moved_to_be": True, "mfe_pts": 12})
    ex = client.get("/api/stats/performance").json()["excursion"]
    assert ex["be_count"] == 1 and ex["be_stopped"] == 1 and ex["be_stopped_avg_mfe_pts"] == 12

    # 取消勾選也要寫得回去（False 不能被當成「沒改」）
    r = client.patch(f"/api/trades/{loser['id']}", json={"moved_to_be": False})
    assert r.json()["moved_to_be"] == 0


def test_parse_time_with_offset():
    from app.importers.topstepx import parse_time
    # 台灣 21:06 = UTC 13:06
    assert parse_time("08/26/2026 21:06:59 +08:00") == "2026-08-26T13:06:59+00:00"


def test_import_creates_account_from_name(client):
    files = {"file": ("t.csv", SAMPLE.read_bytes(), "text/csv")}
    r = client.post("/api/trades/import", data={"account_name": "100K Combine"}, files=files)
    body = r.json()
    assert body["account_created"] is True
    assert body["account"]["starting_balance"] == 100000 and body["account"]["profit_target"] == 6000
    # 同名不分大小寫 → 疊加不重建
    r = client.post("/api/trades/import", data={"account_name": "100k combine"}, files=files)
    assert r.json()["account_created"] is False and r.json()["skipped"] == 3
    assert len(client.get("/api/accounts").json()) == 1


def test_sessions():
    from datetime import datetime, timezone
    from app.sessions import session_of
    # 傳紐約時間，8 月紐約 = UTC-4
    utc = lambda h, m=0: datetime(2026, 8, 26, (h + 4) % 24, m, tzinfo=timezone.utc)
    assert session_of(utc(9, 6)) == "ny_am"
    assert session_of(utc(13)) == "ny_pm"
    assert session_of(utc(23, 59)) == "asia"
    assert session_of(utc(0, 30)) == "off"
    assert session_of(utc(2)) == "london"
    assert session_of(utc(6)) == "off"
