"""API 進出的 pydantic 形狀。對應 docs/api.md。"""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Kind = Literal["eval", "funded"]
Status = Literal["active", "passed", "failed", "closed"]
Direction = Literal["long", "short"]
ExpenseKind = Literal["eval", "reset", "activation", "subscription", "other"]
CertKind = Literal["eval_passed", "payout"]


class AccountIn(BaseModel):
    firm: str
    name: str
    kind: Kind
    starting_balance: float
    profit_target: Optional[float] = None
    note: Optional[str] = None


class AccountPatch(BaseModel):
    firm: Optional[str] = None
    name: Optional[str] = None
    kind: Optional[Kind] = None
    starting_balance: Optional[float] = None
    profit_target: Optional[float] = None
    status: Optional[Status] = None
    note: Optional[str] = None


class TradeIn(BaseModel):
    """匯入器與手 key 共用。external_id 留空由後端補 uuid。"""

    account_id: int
    external_id: Optional[str] = None
    contract: str
    direction: Direction
    size: int = Field(gt=0)
    entry_time: str
    exit_time: str
    entry_price: float
    exit_price: float
    pnl: float
    commissions: float = 0
    fees: float = 0
    planned_stop_pts: Optional[float] = Field(default=None, gt=0)
    setup: Optional[str] = None
    note: Optional[str] = None


class TradePatch(BaseModel):
    planned_stop_pts: Optional[float] = Field(default=None, gt=0)
    setup: Optional[str] = None
    note: Optional[str] = None


class ExpenseIn(BaseModel):
    account_id: Optional[int] = None
    kind: ExpenseKind
    amount: float = Field(gt=0)
    date: str
    note: Optional[str] = None


class CertificateIn(BaseModel):
    account_id: int
    kind: CertKind
    amount: Optional[float] = None
    date: str
    note: Optional[str] = None


class SetupIn(BaseModel):
    name: str
    description: Optional[str] = None


class Filters(BaseModel):
    account_id: Optional[int] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    symbol_root: Optional[str] = None
