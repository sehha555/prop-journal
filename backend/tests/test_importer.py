from pathlib import Path

SAMPLE = Path(__file__).parent / "sample_topstepx.csv"


def test_import_and_dedupe(client, account):
    files = {"file": ("t.csv", SAMPLE.read_bytes(), "text/csv")}
    r = client.post("/api/trades/import", data={"account_id": account["id"]}, files=files)
    assert r.status_code == 200, r.text
    assert r.json() == {"added": 3, "skipped": 0, "importer": "topstepx"}

    r = client.post("/api/trades/import", data={"account_id": account["id"]}, files=files)
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
    r = client.post("/api/trades/import", data={"account_id": account["id"]}, files=files)
    assert r.status_code == 400
    assert "topstepx" in r.json()["detail"]["known_importers"]


def test_journal_patch_computes_r(client, account):
    files = {"file": ("t.csv", SAMPLE.read_bytes(), "text/csv")}
    client.post("/api/trades/import", data={"account_id": account["id"]}, files=files)
    t = client.get("/api/trades", params={"missing_r": 1}).json()[0]
    r = client.patch(f"/api/trades/{t['id']}", json={"planned_stop_pts": 10, "setup": "SMT"})
    body = r.json()
    # MNQ 10 點 × $2 × 1 口 = $20 風險，pnl 38.52 → 1.926 R
    assert body["risk_usd"] == 20
    assert round(body["r_multiple"], 3) == 1.926
    assert len(client.get("/api/trades", params={"missing_r": 1}).json()) == 2
