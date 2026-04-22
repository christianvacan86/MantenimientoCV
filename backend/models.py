from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Activo(Base):
    __tablename__ = "t_mtto_activos"

    id_activo = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    codigo_activo = Column(String(30), nullable=False, unique=True)
    nombre = Column(String(200), nullable=False)
    descripcion = Column(String(4000))
    id_tipo_activo = Column(Integer, ForeignKey("t_mtto_tipos_activo.id_tipo_activo"), nullable=False)
    id_estado = Column(Integer, ForeignKey("t_mtto_estados_activo.id_estado"), nullable=False)
    id_activo_padre = Column(Integer, ForeignKey("t_mtto_activos.id_activo"), nullable=True)
    id_planta = Column(Integer, nullable=False)
    id_area = Column(Integer, nullable=True)
    id_linea = Column(Integer, nullable=True)
    nivel_jerarquia = Column(Integer, nullable=False) # 1,2,3,4
    criticidad = Column(String(1), default='C') # A, B, C
    
    # Optional technical data
    marca = Column(String(100), nullable=True)
    modelo = Column(String(100), nullable=True)
    numero_serie = Column(String(100), nullable=True)
    anio_fabricacion = Column(Integer, nullable=True)
    
    # Audit
    creado_por = Column(String(100), nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    tipo_activo = relationship("TipoActivo")
    estado = relationship("EstadoActivo")
    activos_hijos = relationship("Activo", backref="padre", remote_side=[id_activo])

class TipoActivo(Base):
    __tablename__ = "t_mtto_tipos_activo"
    id_tipo_activo = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(500))

class EstadoActivo(Base):
    __tablename__ = "t_mtto_estados_activo"
    id_estado = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    nombre = Column(String(50), nullable=False)
    color_hex = Column(String(7))
    es_operativo = Column(String(1), default='S')

class OrdenTrabajo(Base):
    __tablename__ = "t_mtto_ordenes_trabajo"
    
    id_ot = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    numero_ot = Column(String(20), nullable=False, unique=True)
    tipo_ot = Column(String(20), nullable=False) # PREVENTIVA, CORRECTIVA, EMERGENCIA, PREDICTIVA
    id_prioridad = Column(Integer, ForeignKey("t_mtto_prioridades.id_prioridad"), nullable=False)
    id_estado_ot = Column(Integer, ForeignKey("t_mtto_estados_ot.id_estado_ot"), nullable=False)
    id_activo = Column(Integer, ForeignKey("t_mtto_activos.id_activo"), nullable=False)
    descripcion = Column(String(4000), nullable=False)
    fecha_programada = Column(DateTime)
    
    asignado_a = Column(String(100), nullable=True)
    
    creado_por = Column(String(100), nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    
    estado = relationship("EstadoOT")
    activo = relationship("Activo")

class EstadoOT(Base):
    __tablename__ = "t_mtto_estados_ot"
    id_estado_ot = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    nombre = Column(String(50), nullable=False)
    codigo = Column(String(20), nullable=False)
    color_hex = Column(String(7))
    orden_kanban = Column(Integer)
    es_estado_final = Column(String(1), default='N')

class Prioridad(Base):
    __tablename__ = "t_mtto_prioridades"
    id_prioridad = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    nombre = Column(String(50), nullable=False)
    nivel = Column(Integer, nullable=False)
    color_hex = Column(String(7))
    tiempo_respuesta_hrs = Column(Integer)

# ==========================================
# REGISTRO DE USO (Horómetros / Contadores)
# ==========================================

class PuntoMedicion(Base):
    __tablename__ = "t_mtto_puntos_medicion"
    
    id_punto = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    id_activo = Column(Integer, ForeignKey("t_mtto_activos.id_activo"), nullable=False)
    nombre = Column(String(100), nullable=False)
    unidad_medida = Column(String(20), nullable=False) 
    valor_acumulado = Column(Float, default=0.0)
    
    activo = relationship("Activo")

class LecturaUso(Base):
    __tablename__ = "t_mtto_lecturas_uso"
    
    id_lectura = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    id_punto = Column(Integer, ForeignKey("t_mtto_puntos_medicion.id_punto"), nullable=False)
    valor_leido = Column(Float, nullable=False)
    fecha_lectura = Column(DateTime(timezone=True), server_default=func.now())
    registrado_por = Column(String(100), nullable=False)
    
    punto_medicion = relationship("PuntoMedicion")

# ==========================================
# REPUESTOS (Abstracción hacia el ERP)
# ==========================================

class RepuestoERP(Base):
    """
    Vista/Tabla bridge hacia el Maestro de Artículos del ERP real.
    En Oracle será configurado idealmente como una Vista (VW) hacia INV_ITEMS de eBusiness Suite/SAP.
    """
    __tablename__ = "t_erp_repuestos_vw"
    
    id_repuesto = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    codigo_erp = Column(String(50), nullable=False, unique=True)
    descripcion = Column(String(300), nullable=False)
    um = Column(String(20), default='UN')
    costo_promedio = Column(Float, default=0.0)
    stock_actual = Column(Float, default=0.0)

# ==========================================
# PLANES DE MANTENIMIENTO PREVENTIVO
# ==========================================

class PlanMantenimiento(Base):
    __tablename__ = "t_mtto_planes"
    
    id_plan = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    id_activo = Column(Integer, ForeignKey("t_mtto_activos.id_activo"), nullable=False)
    nombre = Column(String(200), nullable=False) 
    tipo_frecuencia = Column(String(20), nullable=False)
    frecuencia_valor = Column(Float, nullable=False)
    id_punto_medicion = Column(Integer, ForeignKey("t_mtto_puntos_medicion.id_punto"), nullable=True)
    
    activo = relationship("Activo")

class TareaPlan(Base):
    __tablename__ = "t_mtto_tareas_plan"
    
    id_tarea_plan = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    id_plan = Column(Integer, ForeignKey("t_mtto_planes.id_plan"), nullable=False)
    secuencia = Column(Integer, nullable=False)
    descripcion = Column(String(1000), nullable=False)
    requiere_medicion = Column(String(1), default='N')
    
    plan = relationship("PlanMantenimiento")

class RepuestoPlan(Base):
    """
    Receta/BOM de repuestos atados a este Preventivo para proyección de demanda y costos.
    """
    __tablename__ = "t_mtto_repuestos_plan"
    
    id_repuesto_plan = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    id_plan = Column(Integer, ForeignKey("t_mtto_planes.id_plan"), nullable=False)
    id_repuesto = Column(Integer, ForeignKey("t_erp_repuestos_vw.id_repuesto"), nullable=False)
    cantidad = Column(Float, nullable=False)
    
    plan = relationship("PlanMantenimiento")
    repuesto = relationship("RepuestoERP")

class ChecklistOT(Base):
    __tablename__ = "t_mtto_checklist_ot"
    
    id_checklist = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    id_ot = Column(Integer, ForeignKey("t_mtto_ordenes_trabajo.id_ot"), nullable=False)
    secuencia = Column(Integer, nullable=False)
    descripcion = Column(String(1000), nullable=False)
    
    completado = Column(String(1), default='N')
    valor_medido = Column(String(100), nullable=True)
    observacion_tecnico = Column(String(1000), nullable=True)
    
    ot = relationship("OrdenTrabajo")

# ==========================================
# SOLICITUDES DE MANTENIMIENTO (Avisos)
# ==========================================

class Solicitud(Base):
    """
    Buzón donde Operaciones (Producción) reporta fallas o anomalías. (Mantenimiento Correctivo)
    """
    __tablename__ = "t_mtto_solicitudes"
    
    id_solicitud = Column(Integer, primary_key=True, index=True)
    codigo_compania = Column(String(10), default='ZML_EC', nullable=False)
    id_activo = Column(Integer, ForeignKey("t_mtto_activos.id_activo"), nullable=False)
    
    descripcion_falla = Column(String(2000), nullable=False)
    prioridad_sugerida = Column(String(50), nullable=True) # Alta, Media, Baja
    estado = Column(String(20), default='PENDIENTE') # PENDIENTE, APROBADA, RECHAZADA
    
    reportado_por = Column(String(100), nullable=False)
    fecha_reporte = Column(DateTime(timezone=True), server_default=func.now())
    
    id_ot_generada = Column(Integer, ForeignKey("t_mtto_ordenes_trabajo.id_ot"), nullable=True)
    
    activo = relationship("Activo")
    ot_generada = relationship("OrdenTrabajo")


# ==========================================
# HISTORIAL DE REPROGRAMACIÓN
# ==========================================

class HistorialReprog(Base):
    """
    Registra cada cambio de fecha_programada en una OT.
    Base para el indicador de cumplimiento de planificación.
    """
    __tablename__ = "t_mtto_historial_reprog"

    id_historial     = Column(Integer, primary_key=True, index=True)
    id_ot            = Column(Integer, ForeignKey("t_mtto_ordenes_trabajo.id_ot"), nullable=False)
    fecha_original   = Column(DateTime, nullable=True)   # fecha_programada antes del cambio
    fecha_reasignada = Column(DateTime, nullable=False)  # nueva fecha_programada
    reasignado_por   = Column(String(100), nullable=False)
    fecha_cambio     = Column(DateTime(timezone=True), server_default=func.now())
    motivo           = Column(String(500), nullable=True)

    ot = relationship("OrdenTrabajo")
