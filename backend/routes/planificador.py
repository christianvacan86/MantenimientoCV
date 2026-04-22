from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.services import planificador_service
from database import get_db

router = APIRouter(
    prefix="/api/planificador",
    tags=["Planificador"],
)


@router.get("/board")
def get_board_data(db: Session = Depends(get_db)):
    return planificador_service.get_board_data(db=db)


@router.put("/asignar")
def assign_ot(payload: dict, db: Session = Depends(get_db)):
    return planificador_service.assign_ot(db=db, payload=payload)


@router.get("/historial/{id_ot}")
def get_historial_ot(id_ot: int, db: Session = Depends(get_db)):
    return planificador_service.get_historial_ot(db=db, id_ot=id_ot)


@router.get("/cumplimiento")
def get_cumplimiento(db: Session = Depends(get_db)):
    return planificador_service.get_cumplimiento(db=db)
