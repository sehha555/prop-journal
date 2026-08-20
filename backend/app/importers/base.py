"""匯入器介面。換 firm 就新增一個檔案並註冊到 KNOWN_IMPORTERS。"""

import csv
import io
import re
from abc import ABC, abstractmethod

from ..models import TradeIn


def norm(header: str) -> str:
    """欄名正規化：小寫、去掉非英數。'Entry Time' / 'EnteredAt' / 'entry_time' 都能比對。"""
    return re.sub(r"[^a-z0-9]", "", header.lower())


class Importer(ABC):
    name: str = "base"

    @abstractmethod
    def detect(self, headers: list[str]) -> bool: ...

    @abstractmethod
    def parse(self, rows: list[dict[str, str]], account_id: int) -> list[TradeIn]: ...


def read_csv(data: bytes) -> tuple[list[str], list[dict[str, str]]]:
    text = data.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = [dict(r) for r in reader]
    return list(reader.fieldnames or []), rows


KNOWN_IMPORTERS: list[Importer] = []


def detect_importer(headers: list[str]) -> Importer | None:
    for imp in KNOWN_IMPORTERS:
        if imp.detect(headers):
            return imp
    return None
