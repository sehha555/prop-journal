"""合約點值（每 1 點 = 幾美元）。要加商品在這裡加一行。"""

import re

POINT_VALUE: dict[str, float] = {
    "NQ": 20.0,
    "MNQ": 2.0,
    "ES": 50.0,
    "MES": 5.0,
}

# Topstep 每口來回費用 (交易所費 fees, 佣金 commissions)，美元。
# MNQ 是從真實匯出檔反推（3 口 fees 2.16 / comm 1.50）；其餘是牌價估的，交易到再照匯出檔校正
ROUND_TRIP_FEES: dict[str, tuple[float, float]] = {
    "MNQ": (0.72, 0.50),
    "MES": (0.72, 0.50),
    "NQ": (2.80, 1.00),
    "ES": (2.80, 1.00),
}

# 合約代碼格式：字根 + 月份碼 + 年份，例 MNQU26、ESZ5、NQH26
_CONTRACT_RE = re.compile(r"^([A-Z]{1,4}?)([FGHJKMNQUVXZ])(\d{1,2})$")


def symbol_root(contract: str) -> str | None:
    """從合約代碼推字根；推不出或不認得的商品回 None。"""
    c = contract.strip().upper()
    m = _CONTRACT_RE.match(c)
    if m and m.group(1) in POINT_VALUE:
        return m.group(1)
    # 有些匯出會直接給字根（例：手 key 打 MNQ）
    if c in POINT_VALUE:
        return c
    # 最長前綴比對（MNQ 要贏過 NQ）
    for root in sorted(POINT_VALUE, key=len, reverse=True):
        if c.startswith(root):
            return root
    return None
