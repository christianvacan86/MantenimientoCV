from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

import schemas
from app.services import activos_service
from database import get_db

router = APIRouter(
    prefix="/api/activos",
    tags=["Activos"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.Activo])
def read_activos(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return activos_service.read_activos(db=db, skip=skip, limit=limit)

@router.post("/", response_model=schemas.Activo, status_code=status.HTTP_201_CREATED)
def create_activo(activo: schemas.ActivoCreate, db: Session = Depends(get_db)):
    return activos_service.create_activo(db=db, activo=activo)

@router.get("/{activo_id}", response_model=schemas.Activo)
def read_activo(activo_id: int, db: Session = Depends(get_db)):
    return activos_service.read_activo(db=db, activo_id=activo_id)

@router.put("/{activo_id}", response_model=schemas.Activo)
def update_activo(activo_id: int, activo_req: schemas.ActivoUpdate, db: Session = Depends(get_db)):
    return activos_service.update_activo(db=db, activo_id=activo_id, activo_req=activo_req)
