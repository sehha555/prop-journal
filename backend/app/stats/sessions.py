"""B 時段切片，與 D setup 切片共用。"""

from collections import defaultdict

from ..sessions import SESSION_LABELS, SESSION_ORDER, to_ny
from ..trades_core import parse_iso
from .common import r_coverage, slice_stats

WEEKDAYS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"]


def _group(trades, key_fn, keys=None, label_fn=str):
    buckets = defaultdict(list)
    for t in trades:
        buckets[key_fn(t)].append(t)
    ordered = keys if keys is not None else sorted(buckets)
    return [{"key": k, "label": label_fn(k), **slice_stats(buckets.get(k, []))} for k in ordered]


def compute(trades: list[dict]) -> dict:
    return {
        "r_coverage": r_coverage(trades),
        "by_session": _group(trades, lambda t: t["session"], SESSION_ORDER, lambda k: SESSION_LABELS[k]),
        "by_weekday": _group(trades, lambda t: to_ny(parse_iso(t["entry_time"])).weekday(), list(range(7)), lambda k: WEEKDAYS[k]),
        "by_hour": _group(trades, lambda t: to_ny(parse_iso(t["entry_time"])).hour, list(range(24)), lambda k: f"{k:02d}:00"),
        "by_setup": _group(trades, lambda t: t["setup"] or "（未標）", None, str),
    }
