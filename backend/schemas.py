from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# Tipo Activo
class TipoActivoBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None

class TipoActivo(TipoActivoBase):
    id_tipo_activo: int
    model_config = ConfigDict(from_attributes=True)

# Estado Activo
class EstadoActivoBase(BaseModel):
    nombre: str
    color_hex: Optional[str] = None
    es_operativo: str = 'S'

class EstadoActivo(EstadoActivoBase):
    id_estado: int
    model_config = ConfigDict(from_attributes=True)

# Activot
class ActivoBase(BaseModel):
    codigo_activo: str
    nombre: str
    descripcion: Optional[str] = None
    id_tipo_activo: int
    id_estado: int
    id_activo_padre: Optional[int] = None
    id_planta: int
    id_area: Optional[int] = None
    id_linea: Optional[int] = None
    nivel_jerarquia: int
    criticidad: str = 'C'
    marca: Optional[str] = None
    modelo: Optional[str] = None
    numero_serie: Optional[str] = None
    anio_fabricacion: Optional[int] = None

class ActivoCreate(ActivoBase):
    creado_por: str

class ActivoUpdate(BaseModel):
    codigo_activo: Optional[str] = None
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    id_estado: Optional[int] = None
    nivel_jerarquia: Optional[int] = None

class Activo(ActivoBase):
    id_activo: int
    creado_por: str
    fecha_creacion: datetime
    
    # Nested properties to fetch joined relation text
    # tipo_activo: Optional[TipoActivo] = None
    # estado: Optional[EstadoActivo] = None

    model_config = ConfigDict(from_attributes=True)

# Puntos y Lecturas de Uso
class PuntoMedicion(BaseModel):
    id_punto: int
    id_activo: int
    nombre: str
    unidad_medida: str
    valor_acumulado: float
    model_config = ConfigDict(from_attributes=True)

class RegistroLectura(BaseModel):
    id_activo: int
    horas_operadas: float
    registrado_por: str = 'cvaca'

# Planes y Tareas
class TareaPlanBase(BaseModel):
    secuencia: int
    descripcion: str
    requiere_medicion: str = 'N'

class TareaPlanCreate(TareaPlanBase):
    pass

class TareaPlan(TareaPlanBase):
    id_tarea_plan: int
    id_plan: int
    model_config = ConfigDict(from_attributes=True)

class PlanMantenimientoBase(BaseModel):
    id_activo: int
    nombre: str
    tipo_frecuencia: str
    frecuencia_valor: float
    id_punto_medicion: Optional[int] = None

class PlanMantenimientoCreate(PlanMantenimientoBase):
    tareas: List[TareaPlanCreate] = []

class PlanMantenimiento(PlanMantenimientoBase):
    id_plan: int
    tareas_plan: List[TareaPlan] = []
    model_config = ConfigDict(from_attributes=True)

# OT y Checklist
class EstadoOT(BaseModel):
    id_estado_ot: int
    nombre: str
    codigo: str
    color_hex: Optional[str] = None
    es_estado_final: str
    model_config = ConfigDict(from_attributes=True)

class Prioridad(BaseModel):
    id_prioridad: int
    nombre: str
    color_hex: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ChecklistOT(BaseModel):
    id_checklist: int
    id_ot: int
    secuencia: int
    descripcion: str
    completado: str
    valor_medido: Optional[str] = None
    observacion_tecnico: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
    
class ChecklistOTUpdate(BaseModel):
    completado: str
    valor_medido: Optional[str] = None
    observacion_tecnico: Optional[str] = None

class OrdenTrabajo(BaseModel):
    id_ot: int
    numero_ot: str
    tipo_ot: str
    id_activo: int
    descripcion: str
    fecha_programada: Optional[datetime] = None
    creado_por: str
    fecha_creacion: datetime
    
    # Nested fields for UI convenience
    estado: Optional[EstadoOT] = None
    prioridad: Optional[Prioridad] = None
    checklist: List[ChecklistOT] = []
    model_config = ConfigDict(from_attributes=True)

class Solicitud(BaseModel):
    id_solicitud: int
    id_activo: int
    descripcion_falla: str
    prioridad_sugerida: Optional[str] = None
    estado: str
    reportado_por: str
    fecha_reporte: datetime
    id_ot_generada: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)
