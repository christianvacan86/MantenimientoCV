from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

import models
import schemas


def read_solicitudes(db: Session):
    return db.query(models.Solicitud).order_by(models.Solicitud.fecha_reporte.desc()).all()


def create_solicitud(db: Session, data: schemas.SolicitudCreate):
    activo = db.query(models.Activo).filter(models.Activo.id_activo == data.id_activo).first()
    if not activo:
        raise HTTPException(status_code=404, detail="Activo no encontrado")

    solicitud = models.Solicitud(
        id_activo=data.id_activo,
        descripcion_falla=data.descripcion_falla,
        prioridad_sugerida=data.prioridad_sugerida,
        reportado_por=data.reportado_por,
        estado='PENDIENTE',
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return solicitud


def aprobar_solicitud(db: Session, id_solicitud: int):
    sol = db.query(models.Solicitud).filter(models.Solicitud.id_solicitud == id_solicitud).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if sol.estado != 'PENDIENTE':
        raise HTTPException(status_code=400, detail=f"La solicitud ya fue procesada ({sol.estado})")

    sol.estado = 'APROBADA'

    prioridad_db = db.query(models.Prioridad).filter(
        models.Prioridad.nombre.ilike(f"%{sol.prioridad_sugerida}%")
    ).first()
    estado_open = db.query(models.EstadoOT).filter(models.EstadoOT.codigo == 'OPEN').first()

    if not prioridad_db:
        prioridad_db = db.query(models.Prioridad).order_by(models.Prioridad.nivel.desc()).first()

    nueva_ot = models.OrdenTrabajo(
        numero_ot=f"OT-CORR-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        tipo_ot='CORRECTIVA',
        id_prioridad=prioridad_db.id_prioridad,
        id_estado_ot=estado_open.id_estado_ot,
        id_activo=sol.id_activo,
        descripcion=f"[{sol.reportado_por}] {sol.descripcion_falla}",
        creado_por='planificador',
    )
    db.add(nueva_ot)
    db.commit()

    sol.id_ot_generada = nueva_ot.id_ot
    db.commit()

    return {"message": "OT Generada", "numero_ot": nueva_ot.numero_ot}


def rechazar_solicitud(db: Session, id_solicitud: int, motivo: str = ""):
    sol = db.query(models.Solicitud).filter(models.Solicitud.id_solicitud == id_solicitud).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    if sol.estado != 'PENDIENTE':
        raise HTTPException(status_code=400, detail=f"La solicitud ya fue procesada ({sol.estado})")

    sol.estado = 'RECHAZADA'
    db.commit()
    return {"message": "Solicitud rechazada"}
