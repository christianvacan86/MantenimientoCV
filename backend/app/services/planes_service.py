from sqlalchemy.orm import Session

import models
import schemas


def read_planes(db: Session, skip: int = 0, limit: int = 100):
    planes = db.query(models.PlanMantenimiento).offset(skip).limit(limit).all()
    resultados = []
    for plan in planes:
        dto = schemas.PlanMantenimiento.model_validate(plan)
        tareas_db = (
            db.query(models.TareaPlan)
            .filter(models.TareaPlan.id_plan == plan.id_plan)
            .order_by(models.TareaPlan.secuencia)
            .all()
        )
        dto.tareas_plan = [schemas.TareaPlan.model_validate(t) for t in tareas_db]
        resultados.append(dto)
    return resultados


def create_plan(db: Session, plan: schemas.PlanMantenimientoCreate):
    db_plan = models.PlanMantenimiento(
        id_activo=plan.id_activo,
        nombre=plan.nombre,
        tipo_frecuencia=plan.tipo_frecuencia,
        frecuencia_valor=plan.frecuencia_valor,
        id_punto_medicion=plan.id_punto_medicion,
    )
    db.add(db_plan)
    db.commit()
    db.refresh(db_plan)

    tareas_creadas = []
    for tarea in plan.tareas:
        db_tarea = models.TareaPlan(
            id_plan=db_plan.id_plan,
            secuencia=tarea.secuencia,
            descripcion=tarea.descripcion,
            requiere_medicion=tarea.requiere_medicion,
        )
        db.add(db_tarea)
        tareas_creadas.append(db_tarea)

    db.commit()

    resultado = schemas.PlanMantenimiento.model_validate(db_plan)
    resultado.tareas_plan = [schemas.TareaPlan.model_validate(t) for t in tareas_creadas]
    return resultado
