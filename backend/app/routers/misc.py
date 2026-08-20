"""expenses / certificates / setups / contracts。"""

from fastapi import APIRouter

from ..contracts import POINT_VALUE
from ..models import CertificateIn, ExpenseIn, SetupIn
from . import crud

router = APIRouter(prefix="/api", tags=["misc"])


@router.get("/expenses")
def list_expenses():
    return crud.list_rows("expenses", "date DESC, id DESC")


@router.post("/expenses")
def create_expense(body: ExpenseIn):
    return crud.insert_row("expenses", body.model_dump())


@router.delete("/expenses/{row_id}")
def delete_expense(row_id: int):
    return crud.delete_row("expenses", row_id)


@router.get("/certificates")
def list_certificates():
    return crud.list_rows("certificates", "date DESC, id DESC")


@router.post("/certificates")
def create_certificate(body: CertificateIn):
    return crud.insert_row("certificates", body.model_dump())


@router.delete("/certificates/{row_id}")
def delete_certificate(row_id: int):
    return crud.delete_row("certificates", row_id)


@router.get("/setups")
def list_setups():
    return crud.list_rows("setups", "name")


@router.post("/setups")
def create_setup(body: SetupIn):
    return crud.insert_row("setups", body.model_dump())


@router.delete("/setups/{row_id}")
def delete_setup(row_id: int):
    return crud.delete_row("setups", row_id)


@router.get("/contracts")
def contracts():
    return POINT_VALUE
