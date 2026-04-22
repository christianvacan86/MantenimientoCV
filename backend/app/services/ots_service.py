from fastapi import HTTPException
from sqlalchemy.orm import Session

import models
import schemas


def read_ots(db: Session, skip: int = 0, limit: int = 100):
    ots = db.query(models.OrdenTrabajo).offset(skip).limit(limit).all()

    resultados = []
    for ot in ots:
        dto = schemas.OrdenTrabajo.model_validate(ot)
        estado_db = db.query(models.EstadoOT).filter(models.EstadoOT.id_estado_ot == ot.id_estado_ot).first()
        prioridad_db = db.query(models.Prioridad).filter(models.Prioridad.id_prioridad == ot.id_prioridad).first()
        checklist_db = (
            db.query(models.ChecklistOT)
            .filter(models.ChecklistOT.id_ot == ot.id_ot)
            .order_by(models.ChecklistOT.secuencia)
            .all()
        )

        dto.estado = schemas.EstadoOT.model_validate(estado_db) if estado_db else None
        dto.prioridad = schemas.Prioridad.model_validate(prioridad_db) if prioridad_db else None
        dto.checklist = [schemas.ChecklistOT.model_validate(c) for c in checklist_db]
        resultados.append(dto)

    return resultados


def update_checklist(db: Session, id_checklist: int, data: schemas.ChecklistOTUpdate):
    check = db.query(models.ChecklistOT).filter(models.ChecklistOT.id_checklist == id_checklist).first()
    if not check:
        raise HTTPException(status_code=404, detail="Checklist no encontrado")

    check.completado = data.completado
    check.valor_medido = data.valor_medido
    check.observacion_tecnico = data.observacion_tecnico
    db.commit()

    return {"message": "Checklist actualizado correctamente"}
