"""用 10 筆手算資料驗統計。全部 MNQ（$2/點）、1 口、停損 10 點 → 每筆風險 $20，R = pnl/20。"""

import math

import pytest

ROWS = [
    # (entry 紐約時間, pnl, setup)  R 依序：+2, -1, +1.5, -1, -2.5(爆), +3, -1, +0.5, -1, +2
    ("2026-08-03 09:40", 40, "SMT"),
    ("2026-08-03 10:10", -20, "SMT"),
    ("2026-08-04 09:45", 30, "SSL"),
    ("2026-08-04 13:00", -20, "SSL"),
    ("2026-08-05 09:50", -50, "SSL"),
    ("2026-08-05 10:30", 60, "SMT"),
    ("2026-08-06 03:30", -20, "SMT"),
    ("2026-08-06 20:00", 10, None),
    ("2026-08-07 09:35", -20, "SSL"),
    ("2026-08-07 11:00", 40, "SMT"),
]
R = [2, -1, 1.5, -1, -2.5, 3, -1, 0.5, -1, 2]


@pytest.fixture
def seeded(client, account):
    for i, (entry, pnl, setup) in enumerate(ROWS):
        client.post("/api/trades", json={
            "account_id": account["id"], "external_id": f"m{i}", "contract": "MNQU26",
            "direction": "long", "size": 1,
            "entry_time": entry.replace(" ", "T") + ":00-04:00",
            "exit_time": entry.replace(" ", "T") + ":00-04:00",
            "entry_price": 1, "exit_price": 1, "pnl": pnl,
            "planned_stop_pts": 10, "setup": setup,
        })
    return client


def test_performance(seeded):
    p = seeded.get("/api/stats/performance").json()
    assert p["trade_count"] == 10 and p["total_pnl"] == 50
    assert p["win_rate"] == 50.0
    assert p["profit_factor"] == round(180 / 130, 2)
    # 日損益：+20, +10, +10, -10, +20 → 累積 20,30,40,30,50 → 最大回撤 10
    assert p["max_drawdown"] == 10
    assert p["best_day_pct"] == 40.0  # 20/50


def test_consistency(seeded):
    c = seeded.get("/api/stats/consistency").json()
    assert c["r_coverage"] == {"total": 10, "with_r": 10}
    assert c["expectancy_r"] == round(sum(R) / 10, 3)
    m = sum(R) / 10
    sd = math.sqrt(sum((x - m) ** 2 for x in R) / 9)
    assert c["r_std"] == round(sd, 3)
    assert c["sqn"] == round(m / sd * math.sqrt(10), 2)
    assert [t["external_id"] for t in c["blown_r"]] == ["m4"]
    hist = {h["bucket"]: h["count"] for h in c["r_histogram"]}
    assert hist["-1"] == 4 and hist["<-2"] == 1 and hist["+2"] == 2 and hist["+3"] == 1 and hist["+1"] == 1 and hist["0"] == 1
    # 賺錢日 03(2筆) 04(2) 05(2) 07(2)，賠錢日 06(2)
    assert c["avg_trades_win_day"] == 2.0 and c["avg_trades_loss_day"] == 2.0
    assert c["rolling_expectancy"] == []  # 不足 20 筆
    setups = {s["setup"]: s for s in c["setup_r_std"]}
    assert setups["SMT"]["trade_count"] == 5 and setups["SSL"]["trade_count"] == 4


def test_sessions(seeded):
    s = seeded.get("/api/stats/sessions").json()
    by = {b["key"]: b for b in s["by_session"]}
    assert by["ny_am"]["trade_count"] == 7
    assert by["ny_pm"]["trade_count"] == 1
    assert by["london"]["trade_count"] == 1
    assert by["asia"]["trade_count"] == 1
    setups = {b["key"]: b["trade_count"] for b in s["by_setup"]}
    assert setups["（未標）"] == 1


def test_filters_by_date(seeded):
    p = seeded.get("/api/stats/performance", params={"date_from": "2026-08-05", "date_to": "2026-08-05"}).json()
    assert p["trade_count"] == 2 and p["total_pnl"] == 10


def test_dashboard(seeded, account, monkeypatch):
    # 「本月」跟著真實日期走，把今天釘在 2026-08，測試才不會過了 8 月就壞
    from datetime import datetime
    from app.routers import stats as stats_router

    class Frozen(datetime):
        @classmethod
        def now(cls, tz=None):
            return datetime(2026, 8, 15, 12, tzinfo=tz)

    monkeypatch.setattr(stats_router, "datetime", Frozen)
    seeded.post("/api/expenses", json={"kind": "eval", "amount": 149, "date": "2026-08-01"})
    seeded.post("/api/expenses", json={"kind": "subscription", "amount": 165, "date": "2026-08-01"})
    seeded.post("/api/expenses", json={"account_id": account["id"], "kind": "payout", "amount": 1000, "date": "2026-08-10"})
    d = seeded.get("/api/dashboard").json()
    assert d["totals"] == {"spent": 314, "monthly_recurring": 165, "paid_out": 1000, "net": 686}
    a = d["accounts"][0]
    assert a["balance"] == 50050 and a["trade_count"] == 10 and a["win_rate"] == 50.0
    assert d["month"]["blown_r_count"] == 1 and d["month"]["missing_r_count"] == 0
    assert len(a["curve"]) == 5 and a["curve"][-1]["balance"] == 50050


def test_account_curve():
    from app.stats.common import account_curve

    t = lambda day, pnl: {"ny_date": day, "pnl": pnl, "commissions": 1, "fees": 1}
    # 起始 50,000：+1,002 → 51,000、+2,002 → 53,000（MLL 本該到 51,000，鎖在 50,000）、-1,498 → 51,500
    c = account_curve([t("d1", 1002), t("d2", 2002), t("d3", -1498)], 50000)
    assert [p["balance"] for p in c] == [51000, 53000, 51500]
    assert [p["mll"] for p in c] == [48000, 49000, 50000]
    assert [p["dll"] for p in c] == [49000, 50000, 52000]
    # XFA 從 0 開始，MLL 從 -2,000 往上跟、鎖在 0
    x = account_curve([t("d1", -498), t("d2", 3002)], 0)
    assert [p["mll"] for p in x] == [-2000, -2000] and x[-1]["balance"] == 2500


def test_calendar(client, seeded):
    days = client.get("/api/stats/calendar").json()["days"]
    assert [d["date"] for d in days] == ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07"]
    assert days[0] == {"date": "2026-08-03", "pnl": 20, "count": 2}
    assert days[2]["pnl"] == 10 and days[3]["pnl"] == -10


def test_raw_summary_merges_scale_ins():
    from app.stats.performance import raw_summary

    def t(entry, exit, size, ep, xp, pnl, direction="short"):
        return {"account_id": 1, "direction": direction, "entry_time": entry, "exit_time": exit,
                "size": size, "entry_price": ep, "exit_price": xp, "pnl": pnl}

    x = "2026-09-03T13:38:18+00:00"
    r = raw_summary([
        # 分批空 3 口 + 3 口，同出場 → 合成 6 口；賠 (54.5×3 + 60.75×3)/6 = 57.625 點
        t("2026-09-03T13:36:26+00:00", x, 3, 29219.0, 29273.5, -327.0),
        t("2026-09-03T13:36:30+00:00", x, 3, 29212.75, 29273.5, -364.5),
        # 另一筆賺的：多 10 口賺 20 點
        t("2026-09-04T13:00:00+00:00", "2026-09-04T13:05:00+00:00", 10, 100, 120, 400, "long"),
    ])
    assert r["positions"] == 2 and r["payoff"] == round(400 / 691.5, 2)
    assert r["loss"] == {"count": 1, "avg_usd": -691.5, "avg_pts": 57.62, "avg_size": 6, "min_size": 6, "max_size": 6}
    assert r["win"]["avg_pts"] == 20 and r["win"]["avg_size"] == 10


def test_positions_merge_until_flat():
    from app.stats.performance import positions

    def t(entry, exit, size, pnl, direction="short", ep=100.0, xp=90.0):
        return {"account_id": 1, "direction": direction, "entry_time": entry, "exit_time": exit,
                "size": size, "entry_price": ep, "exit_price": xp, "pnl": pnl}

    ps = positions([
        # 空 6 口，5 分鐘後加空 2 口，中間先部分停利 3 口 → 全部平倉前都算同一筆
        t("2026-09-10T13:00:00+00:00", "2026-09-10T13:03:00+00:00", 3, 300),
        t("2026-09-10T13:00:00+00:00", "2026-09-10T13:20:00+00:00", 3, 300),
        t("2026-09-10T13:05:00+00:00", "2026-09-10T13:20:00+00:00", 2, 200),
        # 剛好在平倉那一秒再進場 → 新的一筆
        t("2026-09-10T13:20:00+00:00", "2026-09-10T13:25:00+00:00", 4, -100),
        # 反手做多（跟上一筆時間重疊也不併）
        t("2026-09-10T13:22:00+00:00", "2026-09-10T13:30:00+00:00", 2, 50, "long", 90.0, 100.0),
    ])
    assert [(p["pnl"], p["size"]) for p in ps] == [(800, 8), (-100, 4), (50, 2)]
