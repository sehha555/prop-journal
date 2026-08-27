from datetime import datetime, timedelta, timezone

from app import excursion

T0 = datetime(2026, 8, 26, 13, 0, tzinfo=timezone.utc)


def bars_1m(highs_lows):
    return [(T0 + timedelta(minutes=i), h, l) for i, (h, l) in enumerate(highs_lows)]


def test_compute_long_and_short():
    # 進場 13:02:30、出場 13:05 → 含 13:02 那根到 13:05 那根
    bars = bars_1m([(100, 99), (101, 98), (105, 99), (110, 97), (102, 101), (120, 90), (130, 80)])
    entry, exit_ = T0 + timedelta(minutes=2, seconds=30), T0 + timedelta(minutes=5)
    assert excursion.compute(bars, entry, exit_, 100, "long", 1) == (20, 10)
    assert excursion.compute(bars, entry, exit_, 100, "short", 1) == (10, 20)
    # 從沒往有利方向走 → 0
    assert excursion.compute(bars_1m([(100, 95)]), T0, T0 + timedelta(minutes=1), 100, "long", 1) == (0, 5)
    assert excursion.compute([], entry, exit_, 100, "long", 1) is None


def test_pick_interval(monkeypatch):
    monkeypatch.undo()  # conftest 把 pick_interval 固定成 1m，這裡測原版
    now = datetime(2026, 8, 27, tzinfo=timezone.utc)
    assert excursion.pick_interval(now - timedelta(days=1), now) == "1m"
    assert excursion.pick_interval(now - timedelta(days=30), now) == "5m"
    assert excursion.pick_interval(now - timedelta(days=90), now) is None


def test_fill_uses_fake_bars(client, account):
    from pathlib import Path
    files = {"file": ("t.csv", (Path(__file__).parent / "sample_topstepx.csv").read_bytes(), "text/csv")}
    client.post("/api/trades/import", data={"account_name": account["name"]}, files=files)
    from app.db import get_conn

    def fake(root, start, end, interval):
        # 每根 K 棒都是進場價 ±3 點，整段涵蓋
        t, out = start - timedelta(minutes=10), []
        while t <= end + timedelta(minutes=10):
            out.append((t, 29603.0, 29597.0))
            t += timedelta(minutes=1)
        return out

    with get_conn() as c:
        res = excursion.fill(c, fetch=fake)
    assert res["updated"] == 3
    t = client.get("/api/trades").json()[0]
    assert t["entry_price"] == 29600 and (t["mfe_pts"], t["mae_pts"]) == (3, 3)
