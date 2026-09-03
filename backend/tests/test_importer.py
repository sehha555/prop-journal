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
    # 匯入就自動填停損：獲利單 250 美元 / (1 口 × $2) = 125 點，pnl 38.52 → 0.154 R
    assert t["planned_stop_pts"] == 125 and round(t["r_multiple"], 3) == 0.154


def test_unknown_csv(client, account):
    files = {"file": ("x.csv", b"a,b,c\n1,2,3\n", "text/csv")}
    r = client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    assert r.status_code == 400
    assert "topstepx" in r.json()["detail"]["known_importers"]


def test_journal_patch_computes_r(client, account):
    files = {"file": ("t.csv", SAMPLE.read_bytes(), "text/csv")}
    client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    t = client.get("/api/trades").json()[0]
    # 自動填的停損可以手動覆蓋：MNQ 10 點 × $2 × 1 口 = $20 風險，pnl 38.52 → 1.926 R
    r = client.patch(f"/api/trades/{t['id']}", json={"planned_stop_pts": 10, "setup": "SMT"})
    body = r.json()
    assert body["risk_usd"] == 20
    assert round(body["r_multiple"], 3) == 1.926


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


def test_be_stats(client, account):
    """保本出場自動判：賺賠不到計畫風險一半（250 的一半 = 125）算保本，不用手動勾"""
    files = {"file": ("t.csv", SAMPLE.read_bytes(), "text/csv")}
    client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    before = client.get("/api/stats/performance").json()["excursion"]["be_count"]
    base = {"account_id": account["id"], "contract": "MNQU6", "direction": "long", "size": 1,
            "entry_time": "2026-08-20T14:00:00Z", "exit_time": "2026-08-20T14:05:00Z",
            "entry_price": 20000, "exit_price": 20000, "mfe_pts": 12}
    client.post("/api/trades", json={**base, "pnl": -40})
    client.post("/api/trades", json={**base, "pnl": 60, "mfe_pts": 20})
    client.post("/api/trades", json={**base, "pnl": -130})
    ex = client.get("/api/stats/performance").json()["excursion"]
    assert ex["be_count"] == before + 2


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
    # 新帳戶自動記一筆購買費用（100K 牌價 99），疊加時不重複記
    exp = client.get("/api/expenses").json()
    assert len(exp) == 1 and exp[0]["kind"] == "eval" and exp[0]["amount"] == 99


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


def test_auto_import_scan(client, account, tmp_path):
    """Downloads 自動匯入：符合的檔匯完搬走，不符合的留著並回錯誤"""
    from app import auto_import
    dl = tmp_path / "dl"
    dl.mkdir()
    (dl / "trades_export-3.csv").write_bytes(SAMPLE.read_bytes())
    (dl / "trades_export-bad.csv").write_bytes(b"a,b\n1,2\n")
    (dl / "other.csv").write_bytes(b"a,b\n1,2\n")
    done = dl / "done"
    results = auto_import.scan(dl, done, account["name"])
    assert results == [{"file": "trades_export-3.csv", "added": 3, "skipped": 0},
                       {"file": "trades_export-bad.csv", "error": results[1]["error"]}]
    assert "認不出" in results[1]["error"]
    assert (done / "trades_export-3.csv").exists() and not (dl / "trades_export-3.csv").exists()
    assert (dl / "trades_export-bad.csv").exists() and (dl / "other.csv").exists()
    assert len(client.get("/api/trades").json()) == 3


def test_auto_import_purge(tmp_path):
    """已匯入資料夾：超過 2 天的檔刪掉，新的留著，不相干的檔不碰"""
    import os
    from app import auto_import
    done = tmp_path / "done"
    done.mkdir()
    now = 1_800_000_000
    old = done / "trades_export-old.csv"
    fresh = done / "trades_export-new.csv"
    other = done / "other.csv"
    for f, age in ((old, 3), (fresh, 1), (other, 10)):
        f.write_bytes(b"x")
        os.utime(f, (now - age * 86400, now - age * 86400))
    assert auto_import.purge(done, 2, now) == ["trades_export-old.csv"]
    assert not old.exists() and fresh.exists() and other.exists()
