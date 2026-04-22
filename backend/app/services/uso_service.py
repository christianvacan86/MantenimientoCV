from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

import models


def registrar_lectura(db: Session, id_activo: int, horas_operadas: float, registrado_por: str):
    padre = db.query(models.Activo).filter(models.Activo.id_activo == id_activo).first()
    if not padre:
        raise HTTPException(status_code=404, detail="Activo Padre no encontrado")

    padre_medidor = db.query(models.PuntoMedicion).filter(models.PuntoMedicion.id_activo == padre.id_activo).first()
    if padre_medidor:
        ultima_lectura = (
            db.query(models.LecturaUso)
            .filter(models.LecturaUso.id_punto == padre_medidor.id_punto)
            .order_by(models.LecturaUso.fecha_lectura.desc())
            .first()
        )
        if ultima_lectura and ultima_lectura.fecha_lectura.date() == datetime.now().date():
            raise HTTPException(
                status_code=400,
                detail="Esta maquina ya reporto horas operacionales el dia de hoy.",
            )

    prefix = padre.codigo_activo
    familia = db.query(models.Activo).filter(models.Activo.codigo_activo.like(f"{prefix}%")).all()

    registros_guardados = 0
    for miembro in familia:
        medidor = db.query(models.PuntoMedicion).filter(models.PuntoMedicion.id_activo == miembro.id_activo).first()
        if medidor:
            medidor.valor_acumulado += horas_operadas
            nueva_lectura = models.LecturaUso(
                id_punto=medidor.id_punto,
                valor_leido=horas_operadas,
                registrado_por=registrado_por,
            )
            db.add(nueva_lectura)
            registros_guardados += 1

    db.commit()

    return {
        "message": "Exito",
        "padre": prefix,
        "horas_inyectadas": horas_operadas,
        "activos_actualizados": registros_guardados,
    }


def get_puntos(db: Session):
    return db.query(models.PuntoMedicion).all()
