from fastapi import APIRouter

from ..models import AccountIn, AccountPatch
from . import crud

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


@router.get("")
def list_accounts():
    return crud.list_rows("accounts")


@router.post("")
def create_account(body: AccountIn):
    return crud.insert_row("accounts", body.model_dump())


@router.patch("/{account_id}")
def patch_account(account_id: int, body: AccountPatch):
    return crud.patch_row("accounts", account_id, body.model_dump())


@router.delete("/{account_id}")
def delete_account(account_id: int):
    return crud.delete_row("accounts", account_id)
