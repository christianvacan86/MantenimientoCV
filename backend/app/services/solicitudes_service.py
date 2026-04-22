from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

import models


def read_solicitudes(db: Session):
    return db.query(models.Solicitud).all()


def aprobar_solicitud(db: Session, id_solicitud: int):
    sol = db.query(models.Solicitud).filter(models.Solicitud.id_solicitud == id_solicitud).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    sol.estado = "APROBADA"

    prioridad_db = db.query(models.Prioridad).filter(models.Prioridad.nombre.like(f"%{sol.prioridad_sugerida}%")).first()
    estado_open = db.query(models.EstadoOT).filter(models.EstadoOT.codigo == "OPEN").first()

    if not prioridad_db:
        prioridad_db = db.query(models.Prioridad).first()

    nueva_ot = models.OrdenTrabajo(
        numero_ot=f"OT-CORR-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        tipo_ot="CORRECTIVA",
        id_prioridad=prioridad_db.id_prioridad,
        id_estado_ot=estado_open.id_estado_ot,
        id_activo=sol.id_activo,
        descripcion=f"[{sol.reportado_por}] {sol.descripcion_falla}",
        creado_por="planificador",
    )
    db.add(nueva_ot)
    db.commit()

    sol.id_ot_generada = nueva_ot.id_ot
    db.commit()

    return {"message": "OT Generada", "numero_ot": nueva_ot.numero_ot}
