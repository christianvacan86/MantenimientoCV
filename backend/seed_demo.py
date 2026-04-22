import os
import sys

# Añadir el path actual al sistema para importaciones relativas
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, SessionLocal
from models import TipoActivo, EstadoActivo, Activo, PuntoMedicion, PlanMantenimiento, TareaPlan, EstadoOT, Prioridad, OrdenTrabajo, ChecklistOT, RepuestoERP, RepuestoPlan, Solicitud
from datetime import datetime, timedelta, date

def seed_database():
    # 1. Crear las tablas (Drop and Create para limpiar)
    print("Iniciando reconstrucción de la Base de Datos DEMO ZAIMELLA (SQLite)...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # 2. Tipos de Estado y Prioridad
        print("Insertando Estados de OTs y Prioridades...")
        est_abierta = EstadoOT(codigo="OPEN", nombre="Abierta")
        est_progreso = EstadoOT(codigo="WIP", nombre="En Progreso")
        est_espera = EstadoOT(codigo="WAIT_MAT", nombre="Esperando Material")
        est_cerrada = EstadoOT(codigo="CLOSE", nombre="Cerrada (Completada)")
        db.add_all([est_abierta, est_progreso, est_espera, est_cerrada])

        prio_critica = Prioridad(nombre="Crítica (Paro de Planta)", nivel=1)
        prio_alta = Prioridad(nombre="Alta", nivel=2)
        prio_media = Prioridad(nombre="Media", nivel=3)
        prio_baja = Prioridad(nombre="Baja", nivel=4)
        db.add_all([prio_critica, prio_alta, prio_media, prio_baja])
        db.commit()

        # 3. Tipos Reales de la Industria de Pañales y Cosmética
        print("Insertando Tipos de Activo...")
        tip_planta = TipoActivo(nombre="Planta de Producción", descripcion="Planta entera")
        tip_linea = TipoActivo(nombre="Línea de Ensamblaje", descripcion="Línea de producción")
        tip_maq = TipoActivo(nombre="Máquina Principal", descripcion="Activo formador central")
        tip_comp = TipoActivo(nombre="Componente Menor", descripcion="Parte o Pieza")
        db.add_all([tip_planta, tip_linea, tip_maq, tip_comp])

        est_operativo = EstadoActivo(nombre="Operativo", color_hex="#00a651", es_operativo='S')
        est_falla = EstadoActivo(nombre="Falla / Detenido", color_hex="#e74c3c", es_operativo='N')
        db.add_all([est_operativo, est_falla])
        db.commit()

        # 4. Activos Taxonómicos: Pantas Zaimella
        print("Construyendo Árbol de Activos (Pañales, Adultos, Mascotas, Cosmética)...")

        # Nivel 1: Plantas
        planta_panales = Activo(
            codigo_activo="PL-BABY-01", nombre="Planta Central Pañales Infantiles", 
            descripcion="Fábrica principal de absorbentes",
            id_tipo_activo=tip_planta.id_tipo_activo, id_estado=est_operativo.id_estado,
            criticidad="A", marca="Varios", id_planta=1, nivel_jerarquia=1, creado_por="sistema"
        )
        planta_adultos = Activo(
            codigo_activo="PL-ADULT-02", nombre="Planta Pañales Adulto", 
            descripcion="Fábrica de pañales incontinencia",
            id_tipo_activo=tip_planta.id_tipo_activo, id_estado=est_operativo.id_estado,
            criticidad="A", marca="Diatec", id_planta=2, nivel_jerarquia=1, creado_por="sistema"
        )
        planta_mascotas = Activo(
            codigo_activo="PL-PETS-03", nombre="Planta Pads Mascotas", 
            descripcion="Fábrica de sabanillas para perros",
            id_tipo_activo=tip_planta.id_tipo_activo, id_estado=est_operativo.id_estado,
            criticidad="B", marca="Fameccanica", id_planta=3, nivel_jerarquia=1, creado_por="sistema"
        )
        planta_cosmetica = Activo(
            codigo_activo="PL-COSM-04", nombre="Planta Cosmética y Líquidos", 
            descripcion="Producción de Toallitas Húmedas y Shampoo",
            id_tipo_activo=tip_planta.id_tipo_activo, id_estado=est_operativo.id_estado,
            criticidad="A", marca="Bausch", id_planta=4, nivel_jerarquia=1, creado_por="sistema"
        )
        db.add_all([planta_panales, planta_adultos, planta_mascotas, planta_cosmetica])
        db.commit()

        # Nivel 2: Líneas y Máquinas (Pañales Infantiles)
        linea_panales_1 = Activo(codigo_activo="LIN-BABY-PA01", nombre="Línea Absorbentes Premium", id_tipo_activo=tip_linea.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=planta_panales.id_activo, criticidad="A", id_planta=1, nivel_jerarquia=2, creado_por="sistema")
        db.add(linea_panales_1)
        db.commit()

        maq_molino = Activo(codigo_activo="MQ-MOL-01", nombre="Molino Formador de Fluff (Celulosa)", id_tipo_activo=tip_maq.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=linea_panales_1.id_activo, criticidad="A", id_planta=1, nivel_jerarquia=3, creado_por="sistema")
        maq_aplicador_sap = Activo(codigo_activo="MQ-SAP-01", nombre="Aplicador Dosificador de SAP", id_tipo_activo=tip_maq.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=linea_panales_1.id_activo, criticidad="A", id_planta=1, nivel_jerarquia=3, creado_por="sistema")
        maq_cortadora = Activo(codigo_activo="MQ-CORT-01", nombre="Cuchilla Corte Final (Die Cutter)", id_tipo_activo=tip_maq.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=linea_panales_1.id_activo, criticidad="A", id_planta=1, nivel_jerarquia=3, creado_por="sistema")
        maq_empacadora = Activo(codigo_activo="MQ-EMP-01", nombre="Bolsadora Automática Gevas", id_tipo_activo=tip_maq.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=linea_panales_1.id_activo, criticidad="B", id_planta=1, nivel_jerarquia=3, creado_por="sistema")
        db.add_all([maq_molino, maq_aplicador_sap, maq_cortadora, maq_empacadora])
        db.commit()

        # Nivel 2: Líneas y Máquinas (Pañales Adultos)
        linea_adultos = Activo(codigo_activo="LIN-ADU-01", nombre="Línea Pañales Incontinencia", id_tipo_activo=tip_linea.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=planta_adultos.id_activo, criticidad="A", id_planta=2, nivel_jerarquia=2, creado_por="sistema")
        db.add(linea_adultos)
        db.commit()
        maq_formadora_adu = Activo(codigo_activo="MQ-FORM-A01", nombre="Tambor Formador Adultos (Diatec)", id_tipo_activo=tip_maq.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=linea_adultos.id_activo, criticidad="A", id_planta=2, nivel_jerarquia=3, creado_por="sistema")
        db.add(maq_formadora_adu)
        db.commit()

        # Nivel 2: Líneas y Máquinas (Mascotas - Sabanillas)
        linea_pads = Activo(codigo_activo="LIN-PET-01", nombre="Línea Sabanillas de Entrenamiento", id_tipo_activo=tip_linea.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=planta_mascotas.id_activo, criticidad="B", id_planta=3, nivel_jerarquia=2, creado_por="sistema")
        db.add(linea_pads)
        db.commit()
        maq_cortadora_pads = Activo(codigo_activo="MQ-CUT-P01", nombre="Corte Guillotina Rotary (Pads)", id_tipo_activo=tip_maq.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=linea_pads.id_activo, criticidad="B", id_planta=3, nivel_jerarquia=3, creado_por="sistema")
        db.add(maq_cortadora_pads)
        db.commit()

        # Nivel 2: Cosmética
        linea_toallas = Activo(codigo_activo="LIN-WET-W01", nombre="Línea Toallitas Húmedas", id_tipo_activo=tip_linea.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=planta_cosmetica.id_activo, criticidad="A", id_planta=4, nivel_jerarquia=2, creado_por="sistema")
        db.add(linea_toallas)
        db.commit()

        maq_mezcladora = Activo(codigo_activo="MQ-MIX-01", nombre="Tanque Mezclador de Loción Infantil", id_tipo_activo=tip_maq.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=linea_toallas.id_activo, criticidad="A", id_planta=4, nivel_jerarquia=3, creado_por="sistema")
        maq_hiladora = Activo(codigo_activo="MQ-HIL-01", nombre="Cortadora Dobladora Spunlace", id_tipo_activo=tip_maq.id_tipo_activo, id_estado=est_operativo.id_estado, id_activo_padre=linea_toallas.id_activo, criticidad="A", id_planta=4, nivel_jerarquia=3, creado_por="sistema")
        db.add_all([maq_mezcladora, maq_hiladora])
        db.commit()

        # 5. Puntos de Medición Estratégicos
        pm_cortadora = PuntoMedicion(id_activo=maq_cortadora.id_activo, nombre="Contador de Pañales (Millones)", unidad_medida="UNIDADES", valor_acumulado=45.2)
        pm_molino = PuntoMedicion(id_activo=maq_molino.id_activo, nombre="Horómetro Rotativo", unidad_medida="HORAS", valor_acumulado=3250)
        pm_mezcladora = PuntoMedicion(id_activo=maq_mezcladora.id_activo, nombre="Lotes Procesados (Batches)", unidad_medida="LOTES", valor_acumulado=1560)
        pm_toallas = PuntoMedicion(id_activo=maq_hiladora.id_activo, nombre="Horómetro de Cuchilla Cizalla", unidad_medida="HORAS", valor_acumulado=950)
        db.add_all([pm_cortadora, pm_molino, pm_mezcladora, pm_toallas])
        db.commit()

        # 6. Repuestos Virtuales (Maestro ERP de Pañales)
        print("Cargando Maestro de Repuestos ERP...")
        rep_cuchilla = RepuestoERP(codigo_erp="REP-DIE-100", descripcion="Cuchilla Corte Troquel Pañal", costo_promedio=5400.0, stock_actual=2.0)
        rep_rodamiento = RepuestoERP(codigo_erp="REP-BRG-20RS", descripcion="Rodamiento Sellado SKF", costo_promedio=45.0, stock_actual=25.0)
        rep_aceite = RepuestoERP(codigo_erp="LUB-FOOD-5W", descripcion="Lubricante Grado Alimenticio / Cosmético (Lt)", costo_promedio=18.0, stock_actual=10.0)
        rep_resist = RepuestoERP(codigo_erp="ELEC-RES-5KW", descripcion="Resistencia Selladora de Paquetes", costo_promedio=85.0, stock_actual=0.0) # Forzamos cero para rotura stock
        db.add_all([rep_cuchilla, rep_rodamiento, rep_aceite, rep_resist])
        db.commit()

        # 7. Planes de Mantenimiento con BOM ERP
        print("Ingresando Planes de Mantenimiento y BOM...")

        # Plan 1: Cuchilla Cortadora
        plan_cuchilla = PlanMantenimiento(
            id_activo=maq_cortadora.id_activo,
            nombre="Afilado y Ajuste de Cuchilla Corte (Die)",
            frecuencia_valor=50, # Cada 50 Millones de pañales
            tipo_frecuencia="USO", id_punto_medicion=pm_cortadora.id_punto
        )
        db.add(plan_cuchilla)
        db.commit()
        db.add(RepuestoPlan(id_plan=plan_cuchilla.id_plan, id_repuesto=rep_cuchilla.id_repuesto, cantidad=1))

        # Plan 2: Mantenimiento Mayor Molino de Fluff
        plan_molino = PlanMantenimiento(
            id_activo=maq_molino.id_activo,
            nombre="Mantenimiento 4000h Molino Desfibrador",
            frecuencia_valor=4000, tipo_frecuencia="USO", id_punto_medicion=pm_molino.id_punto
        )
        db.add(plan_molino)
        db.commit()
        db.add(RepuestoPlan(id_plan=plan_molino.id_plan, id_repuesto=rep_rodamiento.id_repuesto, cantidad=4))

        # Plan 3: Sanitización de Mezcladora de Cosméticos (CIP)
        plan_cip = PlanMantenimiento(
            id_activo=maq_mezcladora.id_activo,
            nombre="Sanitización Química y Lubricación",
            frecuencia_valor=30, tipo_frecuencia="TIEMPO"
        )
        db.add(plan_cip)
        db.commit()
        db.add(RepuestoPlan(id_plan=plan_cip.id_plan, id_repuesto=rep_aceite.id_repuesto, cantidad=5))

        # Plan 4: Empacadora (Necesita resistencia)
        plan_empacadora = PlanMantenimiento(
            id_activo=maq_empacadora.id_activo,
            nombre="Reemplazo Mordaza Térmica (Alerta Rotura Stock esperado)",
            frecuencia_valor=180, tipo_frecuencia="TIEMPO"
        )
        db.add(plan_empacadora)
        db.commit()
        db.add(RepuestoPlan(id_plan=plan_empacadora.id_plan, id_repuesto=rep_resist.id_repuesto, cantidad=2))

        # 8. OTs Actuales y Predictivas
        print("Inyectando OTs activas...")
        ot_empacadora = OrdenTrabajo(
            numero_ot="OT-2026-0150", tipo_ot="PREVENTIVA", id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_empacadora.id_activo,
            descripcion="Reemplazo preventivo de mordazas térmicas según calendario.",
            asignado_a=None, fecha_programada=None, creado_por="sistema"
        )
        ot_molino = OrdenTrabajo(
            numero_ot="OT-2026-0151", tipo_ot="PREVENTIVA", id_prioridad=prio_alta.id_prioridad,
            id_estado_ot=est_progreso.id_estado_ot, id_activo=maq_molino.id_activo,
            descripcion="Cambio de rodamiento SKF de molino de celulosa (Alcanzó 4000h).",
            asignado_a="cvaca", fecha_programada=datetime.now(), creado_por="sistema"
        )
        db.add_all([ot_empacadora, ot_molino])
        db.commit()
        db.add(ChecklistOT(id_ot=ot_molino.id_ot, secuencia=1, descripcion="Bloquear energía eléctrica y neumática (LOTO)"))
        db.add(ChecklistOT(id_ot=ot_molino.id_ot, secuencia=2, descripcion="Extracción de collar de rodamiento del eje de martillos"))
        db.commit()

        # 9. OTs de la próxima semana para demostrar el tablero timeline
        print("Inyectando OTs de demostración para el Tablero Timeline (próxima semana)...")

        # Calcular lunes de la próxima semana desde hoy
        today = date.today()
        days_ahead = (7 - today.weekday()) % 7 or 7
        lun = today + timedelta(days=days_ahead)
        mar = lun + timedelta(1)
        mie = lun + timedelta(2)
        jue = lun + timedelta(3)
        vie = lun + timedelta(4)
        lun2 = lun + timedelta(7)  # semana siguiente

        def dt(d): return datetime(d.year, d.month, d.day, 8, 0, 0)

        # ── LUNES: 2 OTs (verde) ──────────────────────────────────────────────
        ot_lun1 = OrdenTrabajo(
            numero_ot="OT-2026-0200", tipo_ot="PREVENTIVA", id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_molino.id_activo,
            descripcion="Lubricación semanal de ejes y martillos del molino de fluff.",
            asignado_a=None, fecha_programada=dt(lun), creado_por="sistema"
        )
        ot_lun2 = OrdenTrabajo(
            numero_ot="OT-2026-0201", tipo_ot="CORRECTIVA", id_prioridad=prio_alta.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_aplicador_sap.id_activo,
            descripcion="Limpieza de boquillas dosificadoras de SAP bloqueadas.",
            asignado_a=None, fecha_programada=dt(lun), creado_por="sistema"
        )
        db.add_all([ot_lun1, ot_lun2])
        db.commit()
        db.add_all([
            ChecklistOT(id_ot=ot_lun1.id_ot, secuencia=1, descripcion="Bloquear energía eléctrica (LOTO)"),
            ChecklistOT(id_ot=ot_lun1.id_ot, secuencia=2, descripcion="Aplicar grasa SKF LGMT-2 en 4 puntos de lubricación"),
            ChecklistOT(id_ot=ot_lun1.id_ot, secuencia=3, descripcion="Verificar temperatura de rodamientos post-arranque (<55°C)"),
            ChecklistOT(id_ot=ot_lun2.id_ot, secuencia=1, descripcion="Purgar sistema neumático del dosificador"),
            ChecklistOT(id_ot=ot_lun2.id_ot, secuencia=2, descripcion="Reemplazar boquilla dañada con repuesto en almacén"),
        ])
        db.commit()

        # ── MARTES: 3 OTs (ámbar) ─────────────────────────────────────────────
        ot_mar1 = OrdenTrabajo(
            numero_ot="OT-2026-0202", tipo_ot="PREVENTIVA", id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_cortadora.id_activo,
            descripcion="Afilado programado de cuchilla troquel (ciclo 50M unidades).",
            asignado_a=None, fecha_programada=dt(mar), creado_por="sistema"
        )
        ot_mar2 = OrdenTrabajo(
            numero_ot="OT-2026-0203", tipo_ot="CORRECTIVA", id_prioridad=prio_alta.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_formadora_adu.id_activo,
            descripcion="Tambor formador genera absorbente irregular. Ajuste de vacío y guías.",
            asignado_a=None, fecha_programada=dt(mar), creado_por="sistema"
        )
        ot_mar3 = OrdenTrabajo(
            numero_ot="OT-2026-0204", tipo_ot="PREDICTIVA", id_prioridad=prio_baja.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_mezcladora.id_activo,
            descripcion="Análisis de vibración en agitador principal del tanque mezclador.",
            asignado_a=None, fecha_programada=dt(mar), creado_por="sistema"
        )
        db.add_all([ot_mar1, ot_mar2, ot_mar3])
        db.commit()
        db.add_all([
            ChecklistOT(id_ot=ot_mar1.id_ot, secuencia=1, descripcion="Desmontar cuchilla con útil de extracción"),
            ChecklistOT(id_ot=ot_mar1.id_ot, secuencia=2, descripcion="Verificar ángulo de corte (22.5° ± 0.5°)"),
            ChecklistOT(id_ot=ot_mar1.id_ot, secuencia=3, descripcion="Prueba de corte con 100 pañales antes de producción"),
            ChecklistOT(id_ot=ot_mar2.id_ot, secuencia=1, descripcion="Medir caudal de vacío actual (referencia: -450 mbar)"),
            ChecklistOT(id_ot=ot_mar2.id_ot, secuencia=2, descripcion="Ajustar guías laterales al espesor de fluff correcto"),
            ChecklistOT(id_ot=ot_mar3.id_ot, secuencia=1, descripcion="Instalar sensor de vibración en eje agitador"),
            ChecklistOT(id_ot=ot_mar3.id_ot, secuencia=2, descripcion="Registrar espectro FFT en rango 10-1000 Hz"),
        ])
        db.commit()

        # ── MIÉRCOLES: 5 OTs (ROJO — día cargado) ────────────────────────────
        ot_mie1 = OrdenTrabajo(
            numero_ot="OT-2026-0205", tipo_ot="PREVENTIVA", id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_empacadora.id_activo,
            descripcion="Reemplazo de mordazas térmicas de sellado lateral. Alerta stock resistencias.",
            asignado_a=None, fecha_programada=dt(mie), creado_por="sistema"
        )
        ot_mie2 = OrdenTrabajo(
            numero_ot="OT-2026-0206", tipo_ot="CORRECTIVA", id_prioridad=prio_critica.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_hiladora.id_activo,
            descripcion="Cuchilla Spunlace mellada — paro inminente si no se interviene.",
            asignado_a=None, fecha_programada=dt(mie), creado_por="sistema"
        )
        ot_mie3 = OrdenTrabajo(
            numero_ot="OT-2026-0207", tipo_ot="EMERGENCIA", id_prioridad=prio_critica.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_molino.id_activo,
            descripcion="PARO NO PLANIFICADO: falla de sensor de temperatura en cámara de molienda.",
            asignado_a=None, fecha_programada=dt(mie), creado_por="sistema"
        )
        ot_mie4 = OrdenTrabajo(
            numero_ot="OT-2026-0208", tipo_ot="PREVENTIVA", id_prioridad=prio_baja.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_cortadora_pads.id_activo,
            descripcion="Revisión mensual de guillotina rotary: tensión de cuchilla y alineación.",
            asignado_a=None, fecha_programada=dt(mie), creado_por="sistema"
        )
        ot_mie5 = OrdenTrabajo(
            numero_ot="OT-2026-0209", tipo_ot="PREDICTIVA", id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_aplicador_sap.id_activo,
            descripcion="Termografía eléctrica en tablero de control del dosificador SAP.",
            asignado_a=None, fecha_programada=dt(mie), creado_por="sistema"
        )
        db.add_all([ot_mie1, ot_mie2, ot_mie3, ot_mie4, ot_mie5])
        db.commit()
        db.add_all([
            ChecklistOT(id_ot=ot_mie1.id_ot, secuencia=1, descripcion="Confirmar disponibilidad de resistencias en almacén"),
            ChecklistOT(id_ot=ot_mie1.id_ot, secuencia=2, descripcion="Desconectar alimentación 220V de mordazas"),
            ChecklistOT(id_ot=ot_mie1.id_ot, secuencia=3, descripcion="Instalar resistencias nuevas y verificar temperatura de sellado (160°C)"),
            ChecklistOT(id_ot=ot_mie2.id_ot, secuencia=1, descripcion="Cambiar cuchilla Spunlace (requiere 2 técnicos)"),
            ChecklistOT(id_ot=ot_mie2.id_ot, secuencia=2, descripcion="Calibrar presión de corte a 8 bar"),
            ChecklistOT(id_ot=ot_mie3.id_ot, secuencia=1, descripcion="Identificar sensor defectuoso en tablero eléctrico"),
            ChecklistOT(id_ot=ot_mie3.id_ot, secuencia=2, descripcion="Reemplazar sensor PT100 y verificar lectura (70°C ± 2°C)"),
            ChecklistOT(id_ot=ot_mie3.id_ot, secuencia=3, descripcion="Reiniciar PLC y confirmar señal en SCADA"),
            ChecklistOT(id_ot=ot_mie4.id_ot, secuencia=1, descripcion="Medir tensión de cuchilla con tensiómetro"),
            ChecklistOT(id_ot=ot_mie5.id_ot, secuencia=1, descripcion="Tomar termografía con cámara FLIR en tablero principal"),
            ChecklistOT(id_ot=ot_mie5.id_ot, secuencia=2, descripcion="Reportar puntos calientes > 60°C para gestión correctiva"),
        ])
        db.commit()

        # ── JUEVES: 4 OTs (ámbar) ─────────────────────────────────────────────
        ot_jue1 = OrdenTrabajo(
            numero_ot="OT-2026-0210", tipo_ot="PREVENTIVA", id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_formadora_adu.id_activo,
            descripcion="Cambio de sellos y O-rings en sistema de vacío del tambor formador adultos.",
            asignado_a=None, fecha_programada=dt(jue), creado_por="sistema"
        )
        ot_jue2 = OrdenTrabajo(
            numero_ot="OT-2026-0211", tipo_ot="CORRECTIVA", id_prioridad=prio_alta.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_mezcladora.id_activo,
            descripcion="Fuga de loción en brida de salida del tanque mezclador. Reajuste de pernos.",
            asignado_a=None, fecha_programada=dt(jue), creado_por="sistema"
        )
        ot_jue3 = OrdenTrabajo(
            numero_ot="OT-2026-0212", tipo_ot="PREVENTIVA", id_prioridad=prio_baja.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_hiladora.id_activo,
            descripcion="Lubricación bimestral de rodillos tensores de tela spunlace.",
            asignado_a=None, fecha_programada=dt(jue), creado_por="sistema"
        )
        ot_jue4 = OrdenTrabajo(
            numero_ot="OT-2026-0213", tipo_ot="PREDICTIVA", id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_cortadora.id_activo,
            descripcion="Ultrasonido en rodamientos de eje principal de cortadora (detectar desgaste).",
            asignado_a=None, fecha_programada=dt(jue), creado_por="sistema"
        )
        db.add_all([ot_jue1, ot_jue2, ot_jue3, ot_jue4])
        db.commit()
        db.add_all([
            ChecklistOT(id_ot=ot_jue1.id_ot, secuencia=1, descripcion="Despresurizar sistema de vacío"),
            ChecklistOT(id_ot=ot_jue1.id_ot, secuencia=2, descripcion="Reemplazar 8 O-rings de sección 5mm con kit de repuesto"),
            ChecklistOT(id_ot=ot_jue2.id_ot, secuencia=1, descripcion="Localizar brida con fuga mediante inspección visual"),
            ChecklistOT(id_ot=ot_jue2.id_ot, secuencia=2, descripcion="Apretar pernos M16 a torque especificado (45 Nm)"),
            ChecklistOT(id_ot=ot_jue3.id_ot, secuencia=1, descripcion="Aplicar lubricante cosmético grado USDA en 6 rodillos"),
            ChecklistOT(id_ot=ot_jue4.id_ot, secuencia=1, descripcion="Medir decibelios ultrasónicos en 4 rodamientos"),
            ChecklistOT(id_ot=ot_jue4.id_ot, secuencia=2, descripcion="Registrar valores en base de datos histórica"),
        ])
        db.commit()

        # ── VIERNES: 6 OTs (ROJO — día muy cargado) ──────────────────────────
        ot_vie1 = OrdenTrabajo(
            numero_ot="OT-2026-0214", tipo_ot="PREVENTIVA", id_prioridad=prio_alta.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_molino.id_activo,
            descripcion="Mantenimiento mayor 4000h: cambio de rodamientos SKF en eje de martillos.",
            asignado_a=None, fecha_programada=dt(vie), creado_por="sistema"
        )
        ot_vie2 = OrdenTrabajo(
            numero_ot="OT-2026-0215", tipo_ot="CORRECTIVA", id_prioridad=prio_alta.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_aplicador_sap.id_activo,
            descripcion="Sensor de flujo SAP da lectura errática. Reemplazo de sensor Endress+Hauser.",
            asignado_a=None, fecha_programada=dt(vie), creado_por="sistema"
        )
        ot_vie3 = OrdenTrabajo(
            numero_ot="OT-2026-0216", tipo_ot="EMERGENCIA", id_prioridad=prio_critica.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_empacadora.id_activo,
            descripcion="EMERGENCIA: resistencia de sellado inferior quemada — línea detenida.",
            asignado_a=None, fecha_programada=dt(vie), creado_por="sistema"
        )
        ot_vie4 = OrdenTrabajo(
            numero_ot="OT-2026-0217", tipo_ot="PREVENTIVA", id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_cortadora_pads.id_activo,
            descripcion="Cambio de cuchilla guillotina pads mascotas (cada 3M de cortes).",
            asignado_a=None, fecha_programada=dt(vie), creado_por="sistema"
        )
        ot_vie5 = OrdenTrabajo(
            numero_ot="OT-2026-0218", tipo_ot="PREDICTIVA", id_prioridad=prio_baja.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_formadora_adu.id_activo,
            descripcion="Análisis de aceite hidráulico del sistema de vacío adultos (laboratorio).",
            asignado_a=None, fecha_programada=dt(vie), creado_por="sistema"
        )
        ot_vie6 = OrdenTrabajo(
            numero_ot="OT-2026-0219", tipo_ot="CORRECTIVA", id_prioridad=prio_alta.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_hiladora.id_activo,
            descripcion="Rodillo tensor inferior con juego excesivo — produce arrugas en spunlace.",
            asignado_a=None, fecha_programada=dt(vie), creado_por="sistema"
        )
        db.add_all([ot_vie1, ot_vie2, ot_vie3, ot_vie4, ot_vie5, ot_vie6])
        db.commit()
        db.add_all([
            ChecklistOT(id_ot=ot_vie1.id_ot, secuencia=1, descripcion="Bloquear LOTO eléctrico y mecánico (calce de seguridad)"),
            ChecklistOT(id_ot=ot_vie1.id_ot, secuencia=2, descripcion="Extraer eje de martillos con polipasto de 2T"),
            ChecklistOT(id_ot=ot_vie1.id_ot, secuencia=3, descripcion="Instalar 4 rodamientos SKF 6310-2RS nuevos"),
            ChecklistOT(id_ot=ot_vie1.id_ot, secuencia=4, descripcion="Alinear eje con comparador de caratula (< 0.05mm)"),
            ChecklistOT(id_ot=ot_vie2.id_ot, secuencia=1, descripcion="Aislar línea de proceso y drenar"),
            ChecklistOT(id_ot=ot_vie2.id_ot, secuencia=2, descripcion="Instalar sensor E+H Promag 50W y calibrar cero"),
            ChecklistOT(id_ot=ot_vie3.id_ot, secuencia=1, descripcion="Cortar alimentación del tablero empacadora"),
            ChecklistOT(id_ot=ot_vie3.id_ot, secuencia=2, descripcion="Extraer resistencia quemada (modelo HLQ-220V-1500W)"),
            ChecklistOT(id_ot=ot_vie3.id_ot, secuencia=3, descripcion="Instalar resistencia nueva y verificar continuidad"),
            ChecklistOT(id_ot=ot_vie4.id_ot, secuencia=1, descripcion="Retirar cuchilla con protector de corte (EPP)"),
            ChecklistOT(id_ot=ot_vie4.id_ot, secuencia=2, descripcion="Instalar cuchilla nueva y ajustar presión de corte"),
            ChecklistOT(id_ot=ot_vie5.id_ot, secuencia=1, descripcion="Tomar muestra de aceite en envase estéril"),
            ChecklistOT(id_ot=ot_vie5.id_ot, secuencia=2, descripcion="Enviar muestra a laboratorio externo para análisis viscosidad"),
            ChecklistOT(id_ot=ot_vie6.id_ot, secuencia=1, descripcion="Medir juego radial del rodillo (debe ser < 0.1mm)"),
            ChecklistOT(id_ot=ot_vie6.id_ot, secuencia=2, descripcion="Reemplazar rodamiento de rodillo tensor inferior"),
        ])
        db.commit()

        # ── LUNES SIGUIENTE: 2 OTs (verde) ────────────────────────────────────
        ot_lun2_1 = OrdenTrabajo(
            numero_ot="OT-2026-0220", tipo_ot="PREVENTIVA", id_prioridad=prio_baja.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_cortadora.id_activo,
            descripcion="Revisión de ajuste de platinas guía y verificación de paralelismo.",
            asignado_a=None, fecha_programada=dt(lun2), creado_por="sistema"
        )
        ot_lun2_2 = OrdenTrabajo(
            numero_ot="OT-2026-0221", tipo_ot="PREDICTIVA", id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot, id_activo=maq_mezcladora.id_activo,
            descripcion="Inspección visual de revestimiento interno del tanque (pinhole check).",
            asignado_a=None, fecha_programada=dt(lun2), creado_por="sistema"
        )
        db.add_all([ot_lun2_1, ot_lun2_2])
        db.commit()
        db.add_all([
            ChecklistOT(id_ot=ot_lun2_1.id_ot, secuencia=1, descripcion="Medir paralelismo de platinas con galga de espesores"),
            ChecklistOT(id_ot=ot_lun2_2.id_ot, secuencia=1, descripcion="Inspección interior con endoscopio industrial"),
            ChecklistOT(id_ot=ot_lun2_2.id_ot, secuencia=2, descripcion="Fotografiar y registrar cualquier punto de corrosión"),
        ])
        db.commit()

        # ── ESCENARIO MULTI-OT: maq_cortadora tiene 3 OTs el mismo miércoles ────
        # Situación real: llegó una emergencia eléctrica mientras ya había
        # un preventivo y un predictivo programados para esa misma cuchilla.
        print("Inyectando escenario multi-OT: 3 OTs en MQ-CORT-01 el miércoles...")

        ot_multi_a = OrdenTrabajo(
            numero_ot="OT-2026-0230", tipo_ot="EMERGENCIA",
            id_prioridad=prio_critica.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot,
            id_activo=maq_cortadora.id_activo,
            descripcion="EMERGENCIA eléctrica: variador de frecuencia de la cuchilla se disparó por sobrecorriente. Línea PA01 detenida.",
            asignado_a=None, fecha_programada=dt(mie), creado_por="sistema"
        )
        ot_multi_b = OrdenTrabajo(
            numero_ot="OT-2026-0231", tipo_ot="PREVENTIVA",
            id_prioridad=prio_alta.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot,
            id_activo=maq_cortadora.id_activo,
            descripcion="Mantenimiento preventivo semanal Die Cutter: limpieza de guías, ajuste de presión de corte y lubricación de cojinetes.",
            asignado_a=None, fecha_programada=dt(mie), creado_por="sistema"
        )
        ot_multi_c = OrdenTrabajo(
            numero_ot="OT-2026-0232", tipo_ot="PREDICTIVA",
            id_prioridad=prio_media.id_prioridad,
            id_estado_ot=est_abierta.id_estado_ot,
            id_activo=maq_cortadora.id_activo,
            descripcion="Análisis termográfico del tablero eléctrico del Die Cutter (programa predictivo mensual).",
            asignado_a=None, fecha_programada=dt(mie), creado_por="sistema"
        )
        db.add_all([ot_multi_a, ot_multi_b, ot_multi_c])
        db.commit()
        db.add_all([
            ChecklistOT(id_ot=ot_multi_a.id_ot, secuencia=1, descripcion="Bloquear LOTO en tablero principal del Die Cutter"),
            ChecklistOT(id_ot=ot_multi_a.id_ot, secuencia=2, descripcion="Medir resistencia de aislamiento del motor (>1 MΩ)"),
            ChecklistOT(id_ot=ot_multi_a.id_ot, secuencia=3, descripcion="Revisar parámetros del variador (corriente nominal: 38A)"),
            ChecklistOT(id_ot=ot_multi_a.id_ot, secuencia=4, descripcion="Resetear falla F0001 en variador y arranque de prueba"),
            ChecklistOT(id_ot=ot_multi_b.id_ot, secuencia=1, descripcion="Limpiar guías de chapa con solvente dieléctrico"),
            ChecklistOT(id_ot=ot_multi_b.id_ot, secuencia=2, descripcion="Verificar presión de corte con manómetro de banco (7.5 ± 0.3 bar)"),
            ChecklistOT(id_ot=ot_multi_b.id_ot, secuencia=3, descripcion="Aplicar grasa Molykote G-900 en 6 puntos de cojinetes"),
            ChecklistOT(id_ot=ot_multi_c.id_ot, secuencia=1, descripcion="Capturar imagen termográfica del tablero con cámara FLIR E86"),
            ChecklistOT(id_ot=ot_multi_c.id_ot, secuencia=2, descripcion="Comparar con línea base del mes anterior"),
            ChecklistOT(id_ot=ot_multi_c.id_ot, secuencia=3, descripcion="Emitir informe si delta de temperatura > 15°C en algún componente"),
        ])
        db.commit()

        # 10. Solicitudes de Falla (Avisos de Operaciones Diaper y Toallitas)
        sol1 = Solicitud(
            id_activo=maq_aplicador_sap.id_activo,
            descripcion_falla="Tubo dosificador tapado intermitentemente. Los pañales salen con bajo SAP.",
            prioridad_sugerida="Critica", reportado_por="pedro_operador"
        )
        sol2 = Solicitud(
            id_activo=maq_hiladora.id_activo,
            descripcion_falla="Cuchilla Spunlace mellada, hace corte imperfecto en la tela húmeda.",
            prioridad_sugerida="Media", reportado_por="maria_qa"
        )
        db.add_all([sol1, sol2])
        db.commit()

        print("=========================================")
        print("¡BASE DE DATOS DEMO ZAIMELLA CREADA CON ÉXITO Y REPUESTOS REALES!")
        print("=========================================")
        
    except Exception as e:
        print(f"Error sembrando datos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
