from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

import schemas
from app.services import uso_service
from database import get_db

router = APIRouter(
    prefix="/api/uso",
    tags=["Meters_Uso"],
)


@router.post("/")
def registrar_lectura(req: schemas.RegistroLectura, db: Session = Depends(get_db)):
    return uso_service.registrar_lectura(
        db=db,
        id_activo=req.id_activo,
        horas_operadas=req.horas_operadas,
        registrado_por=req.registrado_por,
    )


@router.get("/puntos", response_model=List[schemas.PuntoMedicion])
def get_puntos(db: Session = Depends(get_db)):
    return uso_service.get_puntos(db=db)
