"""交易時段分桶。邊界用紐約時間，改切法只改 SESSIONS 這張表。"""

from datetime import datetime, time
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")

# (key, 中文標籤, 起, 迄)；跨午夜的用 start > end 表示
SESSIONS: list[tuple[str, str, time, time]] = [
    ("asia", "Asia", time(20, 0), time(0, 0)),
    ("london", "London", time(2, 0), time(5, 0)),
    ("ny_am", "NY AM", time(8, 0), time(13, 0)),
    ("ny_pm", "NY PM", time(13, 0), time(18, 0)),
]
OFF = ("off", "Off-hours")

SESSION_LABELS = {k: label for k, label, _, _ in SESSIONS} | {OFF[0]: OFF[1]}
SESSION_ORDER = [k for k, *_ in SESSIONS] + [OFF[0]]


def to_ny(dt_utc: datetime) -> datetime:
    if dt_utc.tzinfo is None:
        dt_utc = dt_utc.replace(tzinfo=ZoneInfo("UTC"))
    return dt_utc.astimezone(NY)


def session_of(dt_utc: datetime) -> str:
    t = to_ny(dt_utc).time()
    for key, _, start, end in SESSIONS:
        if start < end:
            if start <= t < end:
                return key
        elif t >= start or (end != time(0, 0) and t < end):
            return key
    return OFF[0]


def ny_date(dt_utc: datetime) -> str:
    return to_ny(dt_utc).date().isoformat()
