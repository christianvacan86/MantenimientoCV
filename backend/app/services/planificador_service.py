from datetime import datetime, date, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

import models


def get_board_data(db: Session):
    ots = db.query(models.OrdenTrabajo).filter(models.OrdenTrabajo.asignado_a.is_(None)).all()
    ots_enriquecidas = []

    plantas_raw = db.query(models.Activo).filter(models.Activo.nivel_jerarquia == 1).all()
    plantas_dict = {
        p.id_planta: {"id_planta": p.id_planta, "nombre": p.nombre, "codigo": p.codigo_activo}
        for p in plantas_raw
    }

    for ot in ots:
        alerta_stock = False
        detalles_repuestos = []
        fecha_sug = None

        planes_asociados = db.query(models.PlanMantenimiento).filter(
            models.PlanMantenimiento.id_activo == ot.id_activo
        ).all()

        for plan in planes_asociados:
            recetas = db.query(models.RepuestoPlan).filter(
                models.RepuestoPlan.id_plan == plan.id_plan
            ).all()
            for receta in recetas:
                rep = db.query(models.RepuestoERP).filter(
                    models.RepuestoERP.id_repuesto == receta.id_repuesto
                ).first()
                if rep:
                    falta = rep.stock_actual < receta.cantidad
                    if falta:
                        alerta_stock = True
                    detalles_repuestos.append({"descripcion": rep.descripcion, "alerta": falta})

            if not ot.fecha_programada and plan.tipo_frecuencia == "USO" and plan.id_punto_medicion:
                punto = db.query(models.PuntoMedicion).filter(
                    models.PuntoMedicion.id_punto == plan.id_punto_medicion
                ).first()
                if punto:
                    faltante = plan.frecuencia_valor - punto.valor_acumulado
                    promedio_uso_diario = 18.0
                    if faltante > 0:
                        dias_estimados = faltante / promedio_uso_diario
                        if dias_estimados > 30:
                            dias_estimados = dias_estimados % 25 + 1
                        fecha_sug = (
                            datetime.now() + timedelta(days=int(dias_estimados))
                        ).date().isoformat()

        estado = db.query(models.EstadoOT).filter(
            models.EstadoOT.id_estado_ot == ot.id_estado_ot
        ).first()

        checklist_items = (
            db.query(models.ChecklistOT)
            .filter(models.ChecklistOT.id_ot == ot.id_ot)
            .order_by(models.ChecklistOT.secuencia)
            .all()
        )
        checklist_data = [
            {
                "id_checklist": c.id_checklist,
                "secuencia": c.secuencia,
                "descripcion": c.descripcion,
                "completado": c.completado,
                "valor_medido": c.valor_medido,
                "observacion_tecnico": c.observacion_tecnico,
            }
            for c in checklist_items
        ]

        activo = ot.activo
        ot_data = {
            "id_ot": ot.id_ot,
            "numero_ot": ot.numero_ot,
            "tipo_ot": ot.tipo_ot,
            "id_activo": ot.id_activo,
            "activo_codigo": activo.codigo_activo if activo else f"ID:{ot.id_activo}",
            "activo_nombre": activo.nombre if activo else "Desconocido",
            "id_planta": activo.id_planta if activo else None,
            "requiere_paro": ot.tipo_ot in ('EMERGENCIA', 'CORRECTIVA') or (
                ot.tipo_ot == 'PREVENTIVA' and activo and activo.criticidad == 'A'
            ),
            "descripcion": ot.descripcion,
            "fecha_programada": ot.fecha_programada.isoformat().split("T")[0] if ot.fecha_programada else None,
            "fecha_sugerida": fecha_sug or datetime.now().date().isoformat(),
            "estado_nombre": estado.nombre if estado else "N/A",
            "alerta_stock": alerta_stock,
            "repuestos": detalles_repuestos,
            "checklist": checklist_data,
        }
        ots_enriquecidas.append(ot_data)

    return {"data": ots_enriquecidas, "plantas": list(plantas_dict.values())}


def assign_ot(db: Session, payload: dict):
    ot = db.query(models.OrdenTrabajo).filter(
        models.OrdenTrabajo.id_ot == payload.get("id_ot")
    ).first()
    if not ot:
        raise HTTPException(status_code=404, detail="OT no encontrada")

    nueva_fecha = None
    if payload.get("fecha_programada"):
        nueva_fecha = datetime.fromisoformat(payload["fecha_programada"].replace("Z", ""))

        # Validar que no sea fecha pasada
        if nueva_fecha.date() < date.today():
            raise HTTPException(
                status_code=400,
                detail=f"No se puede programar la OT en una fecha pasada ({nueva_fecha.date()})"
            )

        # Registrar historial solo si la fecha realmente cambia
        fecha_anterior = ot.fecha_programada
        if fecha_anterior is None or fecha_anterior.date() != nueva_fecha.date():
            historial = models.HistorialReprog(
                id_ot=ot.id_ot,
                fecha_original=fecha_anterior,
                fecha_reasignada=nueva_fecha,
                reasignado_por=payload.get("reasignado_por") or payload.get("asignado_a") or "planificador",
                motivo=payload.get("motivo"),
            )
            db.add(historial)

        ot.fecha_programada = nueva_fecha
    else:
        ot.fecha_programada = None

    if payload.get("asignado_a"):
        ot.asignado_a = payload.get("asignado_a")

    db.commit()
    return {"message": "Planificado con éxito"}


def get_historial_ot(db: Session, id_ot: int):
    """Devuelve el historial de reprogramaciones de una OT."""
    registros = (
        db.query(models.HistorialReprog)
        .filter(models.HistorialReprog.id_ot == id_ot)
        .order_by(models.HistorialReprog.fecha_cambio)
        .all()
    )
    return [
        {
            "id_historial":     r.id_historial,
            "fecha_original":   r.fecha_original.date().isoformat() if r.fecha_original else None,
            "fecha_reasignada": r.fecha_reasignada.date().isoformat(),
            "reasignado_por":   r.reasignado_por,
            "fecha_cambio":     r.fecha_cambio.isoformat() if r.fecha_cambio else None,
            "motivo":           r.motivo,
        }
        for r in registros
    ]


def get_cumplimiento(db: Session):
    """
    KPI de cumplimiento de planificación.
    Retorna estadísticas de reprogramaciones para el tablero de indicadores.
    """
    total_reprog = db.query(models.HistorialReprog).count()

    # OTs con al menos una reprogramación
    from sqlalchemy import func, distinct
    ots_reprogramadas = db.query(
        func.count(distinct(models.HistorialReprog.id_ot))
    ).scalar() or 0

    total_ots = db.query(models.OrdenTrabajo).count()
    ots_sin_reprog = total_ots - ots_reprogramadas

    # Promedio de reprogramaciones por OT afectada
    promedio = round(total_reprog / ots_reprogramadas, 1) if ots_reprogramadas > 0 else 0

    pct_cumplimiento = round((ots_sin_reprog / total_ots * 100), 1) if total_ots > 0 else 100.0

    return {
        "total_ots":           total_ots,
        "ots_sin_reprog":      ots_sin_reprog,
        "ots_reprogramadas":   ots_reprogramadas,
        "total_reprog":        total_reprog,
        "promedio_reprog_ot":  promedio,
        "pct_cumplimiento":    pct_cumplimiento,
    }
