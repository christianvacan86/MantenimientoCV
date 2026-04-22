from fastapi import HTTPException
from sqlalchemy.orm import Session

import models
import schemas


def read_activos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Activo).offset(skip).limit(limit).all()


def create_activo(db: Session, activo: schemas.ActivoCreate):
    existing = db.query(models.Activo).filter(models.Activo.codigo_activo == activo.codigo_activo).first()
    if existing:
        raise HTTPException(status_code=400, detail="Activo with this code already exists")

    db_activo = models.Activo(**activo.model_dump())
    db.add(db_activo)
    db.commit()
    db.refresh(db_activo)
    return db_activo


def read_activo(db: Session, activo_id: int):
    db_activo = db.query(models.Activo).filter(models.Activo.id_activo == activo_id).first()
    if db_activo is None:
        raise HTTPException(status_code=404, detail="Activo not found")
    return db_activo


def update_activo(db: Session, activo_id: int, activo_req: schemas.ActivoUpdate):
    db_activo = db.query(models.Activo).filter(models.Activo.id_activo == activo_id).first()
    if db_activo is None:
        raise HTTPException(status_code=404, detail="Activo not found")

    update_data = activo_req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_activo, key, value)

    db.commit()
    db.refresh(db_activo)
    return db_activo
