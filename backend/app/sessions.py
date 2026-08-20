"""交易時段分桶。邊界用紐約時間，改切法只改 SESSIONS 這張表。"""

from datetime import datetime, time
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")

# (key, 中文標籤, 起, 迄)；跨午夜的用 start > end 表示
SESSIONS: list[tuple[str, str, time, time]] = [
    ("asia", "Asia", time(18, 0), time(3, 0)),
    ("london", "London", time(3, 0), time(9, 30)),
    ("ny_am", "NY AM", time(9, 30), time(12, 0)),
    ("ny_pm", "NY PM", time(12, 0), time(16, 0)),
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
        elif t >= start or t < end:
            return key
    return OFF[0]


def ny_date(dt_utc: datetime) -> str:
    return to_ny(dt_utc).date().isoformat()
