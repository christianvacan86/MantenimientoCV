from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

import schemas
from app.services import solicitudes_service
from database import get_db

router = APIRouter(
    prefix="/api/solicitudes",
    tags=["Solicitudes"],
)


@router.get("/", response_model=List[schemas.Solicitud])
def read_solicitudes(db: Session = Depends(get_db)):
    return solicitudes_service.read_solicitudes(db=db)


@router.post("/aprobar/{id_solicitud}")
def aprobar_solicitud(id_solicitud: int, db: Session = Depends(get_db)):
    return solicitudes_service.aprobar_solicitud(db=db, id_solicitud=id_solicitud)
