"""TopstepX（ProjectX）Trades 分頁 EXPORT 的 CSV。

UI 欄位：ID, Contract, Size, Entry Time, Exit Time, Duration, Entry Price, Exit Price,
P&L, Commissions, Fees, Direction。實際匯出檔的欄名可能是 Id / ContractName / EnteredAt /
ExitedAt / Type 之類，所以每個欄位都列了別名，正規化後比對。

時間：匯出檔若沒帶時區，視為平台顯示時區（使用者帳號設定為 UTC-4 紐約），轉成 UTC 存。
"""

from datetime import datetime
from zoneinfo import ZoneInfo

from ..models import TradeIn
from .base import Importer, KNOWN_IMPORTERS, norm

NY = ZoneInfo("America/New_York")

ALIASES: dict[str, list[str]] = {
    "external_id": ["id", "tradeid"],
    "contract": ["contract", "contractname", "symbol"],
    "size": ["size", "qty", "quantity"],
    "entry_time": ["entrytime", "enteredat", "entry"],
    "exit_time": ["exittime", "exitedat", "exit"],
    "entry_price": ["entryprice"],
    "exit_price": ["exitprice"],
    "pnl": ["pl", "pnl", "profitloss", "netpl"],
    "commissions": ["commissions", "commission"],
    "fees": ["fees", "fee"],
    "direction": ["direction", "type", "side"],
}
REQUIRED = ["contract", "size", "entry_time", "exit_time", "entry_price", "exit_price", "pnl", "direction"]

# 真實 EXPORT 帶時區：08/26/2026 21:06:59 +08:00（跟平台顯示的時區走）
TIME_FORMATS = ["%m/%d/%Y %H:%M:%S %z", "%Y-%m-%d %H:%M:%S %z", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%m/%d/%Y %H:%M:%S", "%m/%d/%Y %H:%M", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S"]


def parse_time(s: str) -> str:
    s = s.strip()
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        dt = None
        for fmt in TIME_FORMATS:
            try:
                dt = datetime.strptime(s, fmt)
                break
            except ValueError:
                continue
        if dt is None:
            raise ValueError(f"看不懂的時間格式：{s}")
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=NY)
    return dt.astimezone(ZoneInfo("UTC")).isoformat()


def parse_money(s: str) -> float:
    s = s.strip().replace("$", "").replace(",", "")
    if s.startswith("(") and s.endswith(")"):
        s = "-" + s[1:-1]
    return float(s or 0)


class TopstepXImporter(Importer):
    name = "topstepx"

    def _map(self, headers: list[str]) -> dict[str, str]:
        normed = {norm(h): h for h in headers}
        out = {}
        for field, names in ALIASES.items():
            for n in names:
                if n in normed:
                    out[field] = normed[n]
                    break
        return out

    def detect(self, headers: list[str]) -> bool:
        m = self._map(headers)
        return all(k in m for k in REQUIRED)

    def parse(self, rows, account_id):
        m = self._map(list(rows[0].keys()) if rows else [])
        out = []
        for r in rows:
            g = lambda k: (r.get(m[k]) or "").strip() if k in m else ""
            if not g("contract"):
                continue
            direction_raw = g("direction").lower()
            direction = "long" if direction_raw.startswith(("long", "buy", "b")) else "short"
            commissions = parse_money(g("commissions")) if g("commissions") else 0.0
            fees = parse_money(g("fees")) if g("fees") else 0.0
            out.append(TradeIn(
                account_id=account_id,
                external_id=g("external_id") or None,
                contract=g("contract"),
                direction=direction,
                size=int(float(g("size"))),
                entry_time=parse_time(g("entry_time")),
                exit_time=parse_time(g("exit_time")),
                entry_price=parse_money(g("entry_price")),
                exit_price=parse_money(g("exit_price")),
                pnl=parse_money(g("pnl")),
                commissions=commissions,
                fees=fees,
            ))
        return out


KNOWN_IMPORTERS.append(TopstepXImporter())
