from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

import schemas
from app.services import planes_service
from database import get_db

router = APIRouter(
    prefix="/api/planes",
    tags=["Planes_Mantenimiento"],
)


@router.get("/", response_model=List[schemas.PlanMantenimiento])
def read_planes(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return planes_service.read_planes(db=db, skip=skip, limit=limit)


@router.post("/", response_model=schemas.PlanMantenimiento)
def create_plan(plan: schemas.PlanMantenimientoCreate, db: Session = Depends(get_db)):
    return planes_service.create_plan(db=db, plan=plan)
