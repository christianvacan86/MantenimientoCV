from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

import schemas
from app.services import ots_service
from database import get_db

router = APIRouter(
    prefix="/api/ots",
    tags=["Ordenes_Trabajo"],
)


@router.get("/", response_model=List[schemas.OrdenTrabajo])
def read_ots(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return ots_service.read_ots(db=db, skip=skip, limit=limit)


@router.put("/checklist/{id_checklist}")
def update_checklist(id_checklist: int, data: schemas.ChecklistOTUpdate, db: Session = Depends(get_db)):
    return ots_service.update_checklist(db=db, id_checklist=id_checklist, data=data)
