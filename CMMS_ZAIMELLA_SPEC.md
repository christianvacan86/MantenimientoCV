# CMMS Zaimella — Especificación del Sistema de Gestión de Mantenimiento

> **Documento de memoria del proyecto** para uso como contexto en Claude Code.
> Última actualización: 2026-04-08

---

## 1. Visión general del proyecto

### 1.1 Objetivo

Desarrollar un sistema CMMS (Computerized Maintenance Management System) a medida para el grupo Zaimella, empresa manufacturera de pañales y cosméticos para bebé, que opera en múltiples países (Ecuador, Perú, Guatemala, Honduras, El Salvador). El sistema debe cubrir mantenimiento preventivo y correctivo de activos industriales, integrándose con el ecosistema tecnológico existente.

### 1.2 Stack tecnológico

| Componente | Tecnología |
|---|---|
| Frontend | Oracle APEX 24 (PWA para técnicos móviles) |
| Backend / DB | Oracle 21c en AWS RDS |
| ERP integrado | JD Edwards 9.0 / Oracle 11g |
| Infraestructura | AWS (RDS, S3 bucket `zaimella-app-data-2026`) |
| Autenticación | Integrada con esquema de seguridad APEX existente |
| Schemas Oracle | `MNT_CORE` (núcleo), `MNT_PKG` (lógica de negocio) |
| Conectividad ERP | BSSV / vistas sobre tablas JDE (F4111, F0911, F4801) |

### 1.3 Convenciones de desarrollo Zaimella

Seguir los estándares definidos en `ESTANDARES_DESARROLLO_ZAIMELLA.docx`:

- Tablas: prefijo `T_` (ejemplo: `T_MNT_ACTIVOS`)
- Primary Keys: prefijo `PK_`
- Stored Procedures: prefijo `SP_`
- Sequences: prefijo `SQ_`
- Triggers: prefijo `TG_`
- Schemas de datos: `DATA`, `FILES`, `DP`, `ETL` (existentes); `MNT_CORE`, `MNT_PKG` (nuevos para CMMS)

### 1.4 Referencia de benchmarking

Este diseño se basa en las mejores prácticas extraídas de **MP Software / MPindustries** (CMMS líder en Latinoamérica con +35 años de experiencia y +10,000 clientes), complementado con estándares de la industria (eMaint, MaintainX, Tractian, IBM Maximo) y norma UNE-EN 15341:2007 para indicadores de mantenimiento.

---

## 2. Arquitectura modular — 12 módulos en 3 fases

### 2.1 Resumen de fases

| Fase | Módulos | Prioridad |
|---|---|---|
| **Fase 1 (MVP)** | Catálogo de activos, Planes de mantenimiento, Órdenes de trabajo, Solicitudes de mantenimiento | Alta — Core funcional |
| **Fase 2** | Inventario de repuestos, Mano de obra y planificador, Historiales y auditoría, KPIs y reportes | Media — Operación completa |
| **Fase 3** | Compras, Organizaciones multi-planta, Dashboard ejecutivo, Integraciones ERP/IoT | Estratégica — Escalabilidad |

### 2.2 Módulos excluidos del alcance

- ~~Control de herramientas~~ (no requerido)
- ~~Gestión de proveedores~~ (no requerido; servicios externos se manejan como tipo de costo en la OT)

---

## 3. FASE 1 — MVP (Detalle)

### 3.1 Módulo: Catálogo de activos

**Propósito**: Documentar y organizar toda la información referente a equipos e instalaciones de la empresa, constituyendo la base sobre la cual pivota todo el CMMS.

**Jerarquía recursiva de 4 niveles**:

```
Nivel 1: Planta / Ubicación (ej: Planta Quito, Planta Lima)
  └─ Nivel 2: Área (ej: Área de Conversión, Área de Empaque)
       └─ Nivel 3: Línea (ej: Línea 1 Pañales, Línea 2 Toallas)
            └─ Nivel 4: Equipo / Sub-equipo (ej: Motor principal, Rodillo sellador)
```

**Datos por activo**:

- Código único del activo (generado por secuencia, formato: `ACT-{PLANTA}-{SECUENCIAL}`)
- Nombre y descripción
- Tipo de activo (equipo, instalación, vehículo, infraestructura)
- Estado (activo, inactivo, en reparación, dado de baja)
- Activo padre (FK recursiva para jerarquía)
- Ubicación geográfica (planta, área, coordenadas si aplica)
- Datos técnicos: marca, modelo, serie, año de fabricación, capacidad, especificaciones
- Código QR (generado automáticamente para identificación en campo)
- Fecha de adquisición, costo de adquisición, valor actual estimado
- Criticidad (A = crítico, B = importante, C = prescindible) — para priorización de mantenimiento
- Archivos adjuntos: planos, manuales, diagramas, fotos (almacenados en S3)
- Repuestos asociados (relación N:M con catálogo de repuestos)
- Datos del proveedor original (nombre, contacto — campo libre, no módulo)
- Garantía: fecha inicio, fecha fin, condiciones
- Notas libres

**Modelo de datos principal**:

```sql
-- Tabla principal de activos
CREATE TABLE MNT_CORE.T_MNT_ACTIVOS (
    ID_ACTIVO           NUMBER GENERATED ALWAYS AS IDENTITY,
    CODIGO_ACTIVO       VARCHAR2(30)  NOT NULL,
    NOMBRE              VARCHAR2(200) NOT NULL,
    DESCRIPCION         VARCHAR2(4000),
    ID_TIPO_ACTIVO      NUMBER        NOT NULL,
    ID_ESTADO           NUMBER        NOT NULL,
    ID_ACTIVO_PADRE     NUMBER,                    -- FK recursiva
    ID_PLANTA           NUMBER        NOT NULL,
    ID_AREA             NUMBER,
    ID_LINEA            NUMBER,
    NIVEL_JERARQUIA     NUMBER(1)     NOT NULL,    -- 1,2,3,4
    CRITICIDAD          VARCHAR2(1)   DEFAULT 'C', -- A, B, C
    MARCA               VARCHAR2(100),
    MODELO              VARCHAR2(100),
    NUMERO_SERIE        VARCHAR2(100),
    ANIO_FABRICACION    NUMBER(4),
    CAPACIDAD           VARCHAR2(200),
    ESPECIFICACIONES    CLOB,
    CODIGO_QR           VARCHAR2(500),
    FECHA_ADQUISICION   DATE,
    COSTO_ADQUISICION   NUMBER(15,2),
    VALOR_ESTIMADO      NUMBER(15,2),
    PROVEEDOR_ORIGINAL  VARCHAR2(200),
    GARANTIA_INICIO     DATE,
    GARANTIA_FIN        DATE,
    GARANTIA_CONDICIONES VARCHAR2(4000),
    NOTAS               VARCHAR2(4000),
    CODIGO_JDE          VARCHAR2(30),              -- Mapeo con activo fijo en JDE
    CREADO_POR          VARCHAR2(100)  NOT NULL,
    FECHA_CREACION      TIMESTAMP      DEFAULT SYSTIMESTAMP,
    MODIFICADO_POR      VARCHAR2(100),
    FECHA_MODIFICACION  TIMESTAMP,
    CONSTRAINT PK_MNT_ACTIVOS PRIMARY KEY (ID_ACTIVO),
    CONSTRAINT FK_MNT_ACT_PADRE FOREIGN KEY (ID_ACTIVO_PADRE)
        REFERENCES MNT_CORE.T_MNT_ACTIVOS(ID_ACTIVO),
    CONSTRAINT FK_MNT_ACT_TIPO FOREIGN KEY (ID_TIPO_ACTIVO)
        REFERENCES MNT_CORE.T_MNT_TIPOS_ACTIVO(ID_TIPO_ACTIVO),
    CONSTRAINT FK_MNT_ACT_ESTADO FOREIGN KEY (ID_ESTADO)
        REFERENCES MNT_CORE.T_MNT_ESTADOS_ACTIVO(ID_ESTADO),
    CONSTRAINT CK_MNT_ACT_CRIT CHECK (CRITICIDAD IN ('A','B','C')),
    CONSTRAINT CK_MNT_ACT_NIVEL CHECK (NIVEL_JERARQUIA BETWEEN 1 AND 4)
);

-- Archivos adjuntos de activos (referencia a S3)
CREATE TABLE MNT_CORE.T_MNT_ACTIVOS_ARCHIVOS (
    ID_ARCHIVO          NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_ACTIVO           NUMBER NOT NULL,
    NOMBRE_ARCHIVO      VARCHAR2(500) NOT NULL,
    TIPO_ARCHIVO        VARCHAR2(50),              -- pdf, jpg, dwg, etc.
    RUTA_S3             VARCHAR2(1000) NOT NULL,
    TAMANO_BYTES        NUMBER,
    DESCRIPCION         VARCHAR2(500),
    CREADO_POR          VARCHAR2(100) NOT NULL,
    FECHA_CREACION      TIMESTAMP DEFAULT SYSTIMESTAMP,
    CONSTRAINT PK_MNT_ACT_ARCH PRIMARY KEY (ID_ARCHIVO),
    CONSTRAINT FK_MNT_ACT_ARCH FOREIGN KEY (ID_ACTIVO)
        REFERENCES MNT_CORE.T_MNT_ACTIVOS(ID_ACTIVO)
);

-- Tablas de soporte
CREATE TABLE MNT_CORE.T_MNT_TIPOS_ACTIVO (
    ID_TIPO_ACTIVO      NUMBER GENERATED ALWAYS AS IDENTITY,
    NOMBRE              VARCHAR2(100) NOT NULL,
    DESCRIPCION         VARCHAR2(500),
    CONSTRAINT PK_MNT_TIPOS_ACT PRIMARY KEY (ID_TIPO_ACTIVO)
);

CREATE TABLE MNT_CORE.T_MNT_ESTADOS_ACTIVO (
    ID_ESTADO           NUMBER GENERATED ALWAYS AS IDENTITY,
    NOMBRE              VARCHAR2(50) NOT NULL,
    COLOR_HEX           VARCHAR2(7),
    ES_OPERATIVO        CHAR(1) DEFAULT 'S',
    CONSTRAINT PK_MNT_EST_ACT PRIMARY KEY (ID_ESTADO)
);
```

### 3.2 Módulo: Planes de mantenimiento

**Propósito**: Documentar las rutinas y actividades de mantenimiento preventivo que deben realizarse sobre cada activo, con frecuencias configurables, y generar automáticamente las OTs correspondientes.

**Concepto de plantilla de mantenimiento** (inspirado en MPindustries):

Una plantilla define un conjunto estandarizado de tareas que se aplica a uno o varios activos similares. Esto garantiza que todos los equipos del mismo tipo reciban el mismo nivel de atención.

**Tipos de frecuencia / disparadores**:

1. **Por tiempo calendario**: cada N días/semanas/meses (ej: lubricación mensual)
2. **Por lectura/contador**: cada N horas de operación, N unidades producidas, N ciclos (ej: cambio de rodamiento cada 5,000 horas)
3. **Lo que ocurra primero**: combina tiempo + lectura; se dispara el que se cumpla antes
4. **Por evento/condición**: cuando una medición alcanza un umbral (ej: vibración > 4mm/s)

**Estructura de un plan**:

```
Plan de mantenimiento
  ├─ Datos generales: nombre, descripción, tipo (preventivo/predictivo), prioridad
  ├─ Frecuencia / disparador(es)
  ├─ Activos asignados (1 plan → N activos)
  ├─ Lista de tareas (checklist ordenado)
  │    ├─ Tarea 1: descripción, duración estimada, tipo (inspección/ajuste/lubricación/cambio)
  │    ├─ Tarea 2: ...
  │    └─ Sub-tareas opcionales
  ├─ Recursos necesarios
  │    ├─ Mano de obra: especialidad requerida, N técnicos, horas estimadas
  │    ├─ Repuestos: lista de materiales con cantidad por ejecución
  │    └─ Servicios externos: descripción, costo estimado
  └─ Documentación: procedimientos, instrucciones de seguridad (adjuntos S3)
```

**Modelo de datos**:

```sql
CREATE TABLE MNT_CORE.T_MNT_PLANES (
    ID_PLAN             NUMBER GENERATED ALWAYS AS IDENTITY,
    CODIGO_PLAN         VARCHAR2(30) NOT NULL,
    NOMBRE              VARCHAR2(200) NOT NULL,
    DESCRIPCION         VARCHAR2(4000),
    TIPO_MANTENIMIENTO  VARCHAR2(20) NOT NULL,      -- PREVENTIVO, PREDICTIVO
    PRIORIDAD           VARCHAR2(10) DEFAULT 'MEDIA',-- CRITICA, ALTA, MEDIA, BAJA
    ESTADO              VARCHAR2(20) DEFAULT 'ACTIVO',-- ACTIVO, INACTIVO, BORRADOR
    -- Frecuencia por tiempo
    FREQ_TIEMPO_VALOR   NUMBER,
    FREQ_TIEMPO_UNIDAD  VARCHAR2(10),               -- DIA, SEMANA, MES, ANIO
    -- Frecuencia por lectura/contador
    FREQ_LECTURA_VALOR  NUMBER,
    FREQ_LECTURA_UNIDAD VARCHAR2(50),               -- HORAS, UNIDADES, CICLOS, KM
    -- Modo de disparo
    MODO_DISPARO        VARCHAR2(20) DEFAULT 'TIEMPO', -- TIEMPO, LECTURA, PRIMERO, CONDICION
    -- Duración estimada total
    DURACION_ESTIMADA_MIN NUMBER,
    -- Auditoría
    CREADO_POR          VARCHAR2(100) NOT NULL,
    FECHA_CREACION      TIMESTAMP DEFAULT SYSTIMESTAMP,
    MODIFICADO_POR      VARCHAR2(100),
    FECHA_MODIFICACION  TIMESTAMP,
    CONSTRAINT PK_MNT_PLANES PRIMARY KEY (ID_PLAN),
    CONSTRAINT CK_MNT_PLAN_TIPO CHECK (TIPO_MANTENIMIENTO IN ('PREVENTIVO','PREDICTIVO')),
    CONSTRAINT CK_MNT_PLAN_MODO CHECK (MODO_DISPARO IN ('TIEMPO','LECTURA','PRIMERO','CONDICION'))
);

-- Asignación de planes a activos
CREATE TABLE MNT_CORE.T_MNT_PLANES_ACTIVOS (
    ID_PLAN_ACTIVO      NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_PLAN             NUMBER NOT NULL,
    ID_ACTIVO           NUMBER NOT NULL,
    FECHA_ULTIMA_EJECUCION DATE,
    FECHA_PROXIMA       DATE,
    LECTURA_ULTIMA      NUMBER,
    LECTURA_PROXIMA     NUMBER,
    ESTADO              VARCHAR2(20) DEFAULT 'ACTIVO',
    CONSTRAINT PK_MNT_PLAN_ACT PRIMARY KEY (ID_PLAN_ACTIVO),
    CONSTRAINT FK_MNT_PA_PLAN FOREIGN KEY (ID_PLAN) REFERENCES MNT_CORE.T_MNT_PLANES(ID_PLAN),
    CONSTRAINT FK_MNT_PA_ACT FOREIGN KEY (ID_ACTIVO) REFERENCES MNT_CORE.T_MNT_ACTIVOS(ID_ACTIVO),
    CONSTRAINT UK_MNT_PA UNIQUE (ID_PLAN, ID_ACTIVO)
);

-- Tareas del plan (checklist)
CREATE TABLE MNT_CORE.T_MNT_PLANES_TAREAS (
    ID_TAREA            NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_PLAN             NUMBER NOT NULL,
    ORDEN               NUMBER NOT NULL,
    DESCRIPCION         VARCHAR2(1000) NOT NULL,
    TIPO_TAREA          VARCHAR2(30),               -- INSPECCION, AJUSTE, LUBRICACION, CAMBIO, LIMPIEZA, MEDICION
    DURACION_ESTIMADA_MIN NUMBER,
    ID_TAREA_PADRE      NUMBER,                     -- Para sub-tareas
    ES_OBLIGATORIA      CHAR(1) DEFAULT 'S',
    INSTRUCCIONES       CLOB,
    CONSTRAINT PK_MNT_PLAN_TAR PRIMARY KEY (ID_TAREA),
    CONSTRAINT FK_MNT_PT_PLAN FOREIGN KEY (ID_PLAN) REFERENCES MNT_CORE.T_MNT_PLANES(ID_PLAN),
    CONSTRAINT FK_MNT_PT_PADRE FOREIGN KEY (ID_TAREA_PADRE) REFERENCES MNT_CORE.T_MNT_PLANES_TAREAS(ID_TAREA)
);

-- Recursos necesarios por plan
CREATE TABLE MNT_CORE.T_MNT_PLANES_RECURSOS (
    ID_RECURSO          NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_PLAN             NUMBER NOT NULL,
    TIPO_RECURSO        VARCHAR2(20) NOT NULL,      -- MANO_OBRA, REPUESTO, SERVICIO
    DESCRIPCION         VARCHAR2(500) NOT NULL,
    CANTIDAD            NUMBER DEFAULT 1,
    UNIDAD              VARCHAR2(30),
    COSTO_ESTIMADO      NUMBER(15,2),
    ID_REPUESTO         NUMBER,                     -- FK opcional a inventario (Fase 2)
    ESPECIALIDAD        VARCHAR2(100),              -- Para mano de obra
    CONSTRAINT PK_MNT_PLAN_REC PRIMARY KEY (ID_RECURSO),
    CONSTRAINT FK_MNT_PR_PLAN FOREIGN KEY (ID_PLAN) REFERENCES MNT_CORE.T_MNT_PLANES(ID_PLAN)
);
```

**Lógica de programación automática**:

El motor de programación (paquete `MNT_PKG.SP_PROGRAMAR_MANTENIMIENTO`) debe ejecutarse como job diario y:

1. Recorrer todos los planes activos con sus activos asignados
2. Para modo `TIEMPO`: comparar `FECHA_PROXIMA` con `SYSDATE`; si vencida o próxima (ventana configurable), generar OT
3. Para modo `LECTURA`: comparar `LECTURA_PROXIMA` con la última lectura registrada del activo
4. Para modo `PRIMERO`: evaluar ambas condiciones y disparar con la primera que se cumpla
5. Para modo `CONDICION`: evaluar mediciones contra umbrales definidos
6. Al generar la OT, copiar las tareas del plan como checklist de la OT
7. Actualizar `FECHA_ULTIMA_EJECUCION` y recalcular `FECHA_PROXIMA` / `LECTURA_PROXIMA`

### 3.3 Módulo: Órdenes de trabajo (OT)

**Propósito**: Módulo central para crear, asignar, ejecutar y dar seguimiento a todo trabajo de mantenimiento, tanto generado automáticamente por planes preventivos como reportado manualmente (correctivo).

**Tipos de OT**:

- **Preventiva**: generada automáticamente desde un plan de mantenimiento
- **Correctiva**: generada desde una solicitud de mantenimiento o directamente por el administrador
- **De emergencia**: correctiva con prioridad crítica, sin programación previa
- **Predictiva**: disparada por condición/medición fuera de rango

**Flujo de estados configurable (Kanban)**:

```
[Creada] → [Planificada] → [En ejecución] → [En espera] → [Completada] → [Cerrada]
                                                  ↓
                                          [Cancelada]
```

Los estados son completamente personalizables. Cada transición puede tener condiciones (ej: no se puede cerrar si hay tareas pendientes del checklist).

**Datos de la OT**:

- Número secuencial (formato: `OT-{AÑO}-{SECUENCIAL}`)
- Tipo de OT (preventiva, correctiva, emergencia, predictiva)
- Prioridad (crítica, alta, media, baja) — heredada de la criticidad del activo o sobrescrita
- Estado actual (configurable)
- Activo asociado (FK)
- Plan de mantenimiento origen (FK, null si es correctiva)
- Solicitud origen (FK, null si no viene de solicitud)
- Descripción del trabajo
- Fecha de creación, fecha programada, fecha de inicio real, fecha de finalización real
- Técnico(s) asignado(s) (relación N:M)
- Checklist de tareas (copiado del plan o manual)
- Repuestos utilizados (con cantidades reales)
- Horas-hombre registradas
- Costos: mano de obra, repuestos, servicios externos
- Observaciones y notas de cierre
- Causa de falla (para correctivas): catálogo configurable
- Tipo de falla: catálogo configurable
- Archivos adjuntos: fotos antes/después, documentos (S3)
- Firma digital del técnico al completar (opcional)
- Evaluación de satisfacción (cuando se origina desde solicitud)

**Vistas de OT en APEX**:

1. **Vista Kanban**: tablero con columnas por estado, drag-and-drop para cambiar etapa
2. **Vista Lista**: grilla con filtros avanzados, acciones masivas, exportación
3. **Vista Calendario de Recursos**: agenda por técnico mostrando OTs asignadas y disponibilidad

**Modelo de datos**:

```sql
CREATE TABLE MNT_CORE.T_MNT_ORDENES_TRABAJO (
    ID_OT               NUMBER GENERATED ALWAYS AS IDENTITY,
    NUMERO_OT           VARCHAR2(20) NOT NULL,
    TIPO_OT             VARCHAR2(20) NOT NULL,      -- PREVENTIVA, CORRECTIVA, EMERGENCIA, PREDICTIVA
    ID_PRIORIDAD        NUMBER NOT NULL,
    ID_ESTADO_OT        NUMBER NOT NULL,
    ID_ACTIVO           NUMBER NOT NULL,
    ID_PLAN             NUMBER,                     -- NULL si correctiva
    ID_SOLICITUD        NUMBER,                     -- NULL si no viene de solicitud
    DESCRIPCION         VARCHAR2(4000) NOT NULL,
    FECHA_PROGRAMADA    DATE,
    FECHA_INICIO_REAL   TIMESTAMP,
    FECHA_FIN_REAL      TIMESTAMP,
    DURACION_ESTIMADA_MIN NUMBER,
    DURACION_REAL_MIN   NUMBER,
    ID_CAUSA_FALLA      NUMBER,                     -- Para correctivas
    ID_TIPO_FALLA       NUMBER,                     -- Para correctivas
    OBSERVACIONES_CIERRE VARCHAR2(4000),
    COSTO_MANO_OBRA     NUMBER(15,2) DEFAULT 0,
    COSTO_REPUESTOS     NUMBER(15,2) DEFAULT 0,
    COSTO_SERVICIOS     NUMBER(15,2) DEFAULT 0,
    COSTO_TOTAL         NUMBER(15,2) GENERATED ALWAYS AS (COSTO_MANO_OBRA + COSTO_REPUESTOS + COSTO_SERVICIOS) VIRTUAL,
    EVALUACION_SATISFACCION NUMBER(1),              -- 1-5
    CREADO_POR          VARCHAR2(100) NOT NULL,
    FECHA_CREACION      TIMESTAMP DEFAULT SYSTIMESTAMP,
    MODIFICADO_POR      VARCHAR2(100),
    FECHA_MODIFICACION  TIMESTAMP,
    CONSTRAINT PK_MNT_OT PRIMARY KEY (ID_OT),
    CONSTRAINT FK_MNT_OT_ACTIVO FOREIGN KEY (ID_ACTIVO) REFERENCES MNT_CORE.T_MNT_ACTIVOS(ID_ACTIVO),
    CONSTRAINT FK_MNT_OT_PLAN FOREIGN KEY (ID_PLAN) REFERENCES MNT_CORE.T_MNT_PLANES(ID_PLAN),
    CONSTRAINT FK_MNT_OT_ESTADO FOREIGN KEY (ID_ESTADO_OT) REFERENCES MNT_CORE.T_MNT_ESTADOS_OT(ID_ESTADO_OT),
    CONSTRAINT CK_MNT_OT_TIPO CHECK (TIPO_OT IN ('PREVENTIVA','CORRECTIVA','EMERGENCIA','PREDICTIVA'))
);

-- Estados de OT (configurables)
CREATE TABLE MNT_CORE.T_MNT_ESTADOS_OT (
    ID_ESTADO_OT        NUMBER GENERATED ALWAYS AS IDENTITY,
    NOMBRE              VARCHAR2(50) NOT NULL,
    CODIGO              VARCHAR2(20) NOT NULL,
    COLOR_HEX           VARCHAR2(7),
    ORDEN_KANBAN        NUMBER,
    ES_ESTADO_FINAL     CHAR(1) DEFAULT 'N',
    PERMITE_EDICION     CHAR(1) DEFAULT 'S',
    CONSTRAINT PK_MNT_EST_OT PRIMARY KEY (ID_ESTADO_OT)
);

-- Transiciones válidas entre estados
CREATE TABLE MNT_CORE.T_MNT_TRANSICIONES_OT (
    ID_TRANSICION       NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_ESTADO_ORIGEN    NUMBER NOT NULL,
    ID_ESTADO_DESTINO   NUMBER NOT NULL,
    REQUIERE_CHECKLIST_COMPLETO CHAR(1) DEFAULT 'N',
    REQUIERE_OBSERVACION CHAR(1) DEFAULT 'N',
    CONSTRAINT PK_MNT_TRANS_OT PRIMARY KEY (ID_TRANSICION),
    CONSTRAINT FK_MNT_TR_ORIG FOREIGN KEY (ID_ESTADO_ORIGEN) REFERENCES MNT_CORE.T_MNT_ESTADOS_OT(ID_ESTADO_OT),
    CONSTRAINT FK_MNT_TR_DEST FOREIGN KEY (ID_ESTADO_DESTINO) REFERENCES MNT_CORE.T_MNT_ESTADOS_OT(ID_ESTADO_OT)
);

-- Asignación de técnicos a OT
CREATE TABLE MNT_CORE.T_MNT_OT_TECNICOS (
    ID_OT_TECNICO       NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_OT               NUMBER NOT NULL,
    ID_TECNICO          NUMBER NOT NULL,
    HORAS_TRABAJADAS    NUMBER(6,2),
    ES_RESPONSABLE      CHAR(1) DEFAULT 'N',
    CONSTRAINT PK_MNT_OT_TEC PRIMARY KEY (ID_OT_TECNICO),
    CONSTRAINT FK_MNT_OTT_OT FOREIGN KEY (ID_OT) REFERENCES MNT_CORE.T_MNT_ORDENES_TRABAJO(ID_OT),
    CONSTRAINT FK_MNT_OTT_TEC FOREIGN KEY (ID_TECNICO) REFERENCES MNT_CORE.T_MNT_TECNICOS(ID_TECNICO)
);

-- Checklist de tareas ejecutadas en la OT
CREATE TABLE MNT_CORE.T_MNT_OT_TAREAS (
    ID_OT_TAREA         NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_OT               NUMBER NOT NULL,
    ORDEN               NUMBER NOT NULL,
    DESCRIPCION         VARCHAR2(1000) NOT NULL,
    COMPLETADA          CHAR(1) DEFAULT 'N',
    FECHA_COMPLETADA    TIMESTAMP,
    COMPLETADA_POR      VARCHAR2(100),
    OBSERVACION         VARCHAR2(1000),
    CONSTRAINT PK_MNT_OT_TAR PRIMARY KEY (ID_OT_TAREA),
    CONSTRAINT FK_MNT_OTTAR_OT FOREIGN KEY (ID_OT) REFERENCES MNT_CORE.T_MNT_ORDENES_TRABAJO(ID_OT)
);

-- Repuestos consumidos en la OT
CREATE TABLE MNT_CORE.T_MNT_OT_REPUESTOS (
    ID_OT_REPUESTO      NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_OT               NUMBER NOT NULL,
    ID_REPUESTO         NUMBER,                     -- FK a inventario (Fase 2, nullable en Fase 1)
    DESCRIPCION         VARCHAR2(500) NOT NULL,
    CANTIDAD            NUMBER NOT NULL,
    COSTO_UNITARIO      NUMBER(15,2),
    COSTO_TOTAL         NUMBER(15,2) GENERATED ALWAYS AS (CANTIDAD * COSTO_UNITARIO) VIRTUAL,
    CONSTRAINT PK_MNT_OT_REP PRIMARY KEY (ID_OT_REPUESTO),
    CONSTRAINT FK_MNT_OTREP_OT FOREIGN KEY (ID_OT) REFERENCES MNT_CORE.T_MNT_ORDENES_TRABAJO(ID_OT)
);

-- Archivos adjuntos de OT
CREATE TABLE MNT_CORE.T_MNT_OT_ARCHIVOS (
    ID_ARCHIVO          NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_OT               NUMBER NOT NULL,
    NOMBRE_ARCHIVO      VARCHAR2(500) NOT NULL,
    TIPO_ARCHIVO        VARCHAR2(50),
    RUTA_S3             VARCHAR2(1000) NOT NULL,
    TAMANO_BYTES        NUMBER,
    DESCRIPCION         VARCHAR2(500),
    CREADO_POR          VARCHAR2(100) NOT NULL,
    FECHA_CREACION      TIMESTAMP DEFAULT SYSTIMESTAMP,
    CONSTRAINT PK_MNT_OT_ARCH PRIMARY KEY (ID_ARCHIVO),
    CONSTRAINT FK_MNT_OTARCH_OT FOREIGN KEY (ID_OT) REFERENCES MNT_CORE.T_MNT_ORDENES_TRABAJO(ID_OT)
);

-- Catálogo de causas de falla
CREATE TABLE MNT_CORE.T_MNT_CAUSAS_FALLA (
    ID_CAUSA_FALLA      NUMBER GENERATED ALWAYS AS IDENTITY,
    NOMBRE              VARCHAR2(200) NOT NULL,
    DESCRIPCION         VARCHAR2(500),
    CONSTRAINT PK_MNT_CAUSA_FALLA PRIMARY KEY (ID_CAUSA_FALLA)
);

-- Catálogo de tipos de falla
CREATE TABLE MNT_CORE.T_MNT_TIPOS_FALLA (
    ID_TIPO_FALLA       NUMBER GENERATED ALWAYS AS IDENTITY,
    NOMBRE              VARCHAR2(200) NOT NULL,
    DESCRIPCION         VARCHAR2(500),
    CONSTRAINT PK_MNT_TIPO_FALLA PRIMARY KEY (ID_TIPO_FALLA)
);

-- Catálogo de prioridades
CREATE TABLE MNT_CORE.T_MNT_PRIORIDADES (
    ID_PRIORIDAD        NUMBER GENERATED ALWAYS AS IDENTITY,
    NOMBRE              VARCHAR2(50) NOT NULL,       -- CRITICA, ALTA, MEDIA, BAJA
    NIVEL               NUMBER NOT NULL,             -- 1=máxima, 4=mínima
    COLOR_HEX           VARCHAR2(7),
    TIEMPO_RESPUESTA_HRS NUMBER,                     -- SLA en horas
    CONSTRAINT PK_MNT_PRIORIDAD PRIMARY KEY (ID_PRIORIDAD)
);
```

### 3.4 Módulo: Solicitudes de mantenimiento

**Propósito**: Permitir que cualquier empleado de la empresa reporte incidencias o necesidades de mantenimiento de forma rápida y sencilla, manteniendo informado al solicitante del estado en todo momento.

**Flujo de solicitudes**:

```
[Solicitante reporta] → [Recibida] → [En evaluación] → [Aprobada → Genera OT]
                                                      → [Rechazada → Notifica]
                                     [OT Completada] → [Evaluación satisfacción]
```

**Características del portal de solicitudes**:

- Acceso vía URL pública o QR del equipo (no requiere usuario APEX completo)
- Escaneo de código QR para asociar automáticamente al activo
- Campos: asunto, descripción, foto (cámara del móvil), ubicación, prioridad percibida
- Notificación automática al equipo de mantenimiento al recibirse
- Tracking: el solicitante puede consultar el estado con un código de seguimiento
- Evaluación de satisfacción al cierre (escala 1-5 + comentario)

**Modelo de datos**:

```sql
CREATE TABLE MNT_CORE.T_MNT_SOLICITUDES (
    ID_SOLICITUD        NUMBER GENERATED ALWAYS AS IDENTITY,
    NUMERO_SOLICITUD    VARCHAR2(20) NOT NULL,
    ASUNTO              VARCHAR2(200) NOT NULL,
    DESCRIPCION         VARCHAR2(4000),
    ID_ACTIVO           NUMBER,                     -- Puede ser NULL si no se identifica
    ID_ESTADO_SOL       NUMBER NOT NULL,
    SOLICITANTE_NOMBRE  VARCHAR2(200) NOT NULL,
    SOLICITANTE_EMAIL   VARCHAR2(200),
    SOLICITANTE_AREA    VARCHAR2(200),
    PRIORIDAD_PERCIBIDA VARCHAR2(20),
    CODIGO_SEGUIMIENTO  VARCHAR2(20) NOT NULL,       -- Para tracking público
    ID_OT_GENERADA      NUMBER,                     -- FK a OT cuando se aprueba
    MOTIVO_RECHAZO      VARCHAR2(1000),
    EVALUACION          NUMBER(1),                   -- 1-5
    COMENTARIO_EVALUACION VARCHAR2(1000),
    CREADO_POR          VARCHAR2(100),
    FECHA_CREACION      TIMESTAMP DEFAULT SYSTIMESTAMP,
    FECHA_ATENCION      TIMESTAMP,
    FECHA_CIERRE        TIMESTAMP,
    CONSTRAINT PK_MNT_SOLICITUD PRIMARY KEY (ID_SOLICITUD),
    CONSTRAINT FK_MNT_SOL_ACT FOREIGN KEY (ID_ACTIVO) REFERENCES MNT_CORE.T_MNT_ACTIVOS(ID_ACTIVO),
    CONSTRAINT FK_MNT_SOL_OT FOREIGN KEY (ID_OT_GENERADA) REFERENCES MNT_CORE.T_MNT_ORDENES_TRABAJO(ID_OT)
);
```

### 3.5 Módulo: Lecturas y mediciones (complemento Fase 1)

**Propósito**: Registrar lecturas periódicas de contadores, horómetros, y mediciones de variables operativas. Las lecturas alimentan el motor de programación (modo LECTURA) y las mediciones sirven para detección temprana de anomalías.

```sql
-- Tipos de lectura/medición configurables por activo
CREATE TABLE MNT_CORE.T_MNT_TIPOS_LECTURA (
    ID_TIPO_LECTURA     NUMBER GENERATED ALWAYS AS IDENTITY,
    NOMBRE              VARCHAR2(100) NOT NULL,      -- Horómetro, Contador producción, Temperatura, Vibración
    UNIDAD_MEDIDA       VARCHAR2(30) NOT NULL,       -- horas, unidades, °C, mm/s, PSI
    ES_CONTADOR         CHAR(1) DEFAULT 'N',         -- S = acumulativo, N = valor puntual
    CONSTRAINT PK_MNT_TIPO_LECT PRIMARY KEY (ID_TIPO_LECTURA)
);

-- Configuración de lecturas por activo
CREATE TABLE MNT_CORE.T_MNT_ACTIVOS_LECTURAS_CONFIG (
    ID_CONFIG           NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_ACTIVO           NUMBER NOT NULL,
    ID_TIPO_LECTURA     NUMBER NOT NULL,
    LIMITE_INFERIOR     NUMBER,
    LIMITE_SUPERIOR     NUMBER,
    ALERTA_INFERIOR     NUMBER,                     -- Umbral de advertencia
    ALERTA_SUPERIOR     NUMBER,
    CONSTRAINT PK_MNT_ACT_LECT_CFG PRIMARY KEY (ID_CONFIG),
    CONSTRAINT FK_MNT_ALC_ACT FOREIGN KEY (ID_ACTIVO) REFERENCES MNT_CORE.T_MNT_ACTIVOS(ID_ACTIVO),
    CONSTRAINT FK_MNT_ALC_TIPO FOREIGN KEY (ID_TIPO_LECTURA) REFERENCES MNT_CORE.T_MNT_TIPOS_LECTURA(ID_TIPO_LECTURA)
);

-- Registro de lecturas
CREATE TABLE MNT_CORE.T_MNT_LECTURAS (
    ID_LECTURA          NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_ACTIVO           NUMBER NOT NULL,
    ID_TIPO_LECTURA     NUMBER NOT NULL,
    VALOR               NUMBER NOT NULL,
    FECHA_LECTURA       TIMESTAMP NOT NULL,
    ESTADO_ALERTA       VARCHAR2(20),               -- NORMAL, ADVERTENCIA, CRITICO
    REGISTRADO_POR      VARCHAR2(100) NOT NULL,
    NOTAS               VARCHAR2(500),
    CONSTRAINT PK_MNT_LECTURAS PRIMARY KEY (ID_LECTURA),
    CONSTRAINT FK_MNT_LECT_ACT FOREIGN KEY (ID_ACTIVO) REFERENCES MNT_CORE.T_MNT_ACTIVOS(ID_ACTIVO),
    CONSTRAINT FK_MNT_LECT_TIPO FOREIGN KEY (ID_TIPO_LECTURA) REFERENCES MNT_CORE.T_MNT_TIPOS_LECTURA(ID_TIPO_LECTURA)
);
```

---

## 4. FASE 2 — Operación completa (Detalle)

### 4.1 Módulo: Inventario de repuestos

**Propósito**: Gestionar existencias de materiales y repuestos, multi-almacén, con kardex de movimientos, niveles de stock, y vinculación con JDE (tabla F4111).

**Funcionalidades clave**:

- Catálogo de repuestos con datos técnicos, foto, ubicación en almacén
- Multi-almacén (uno por planta)
- Movimientos de entrada (compra, devolución) y salida (consumo en OT, ajuste)
- Kardex con trazabilidad completa
- Niveles de stock: mínimo, máximo, punto de reorden
- Valuación de inventario (costo promedio ponderado)
- Relación N:M repuesto ↔ activo (qué repuestos usa cada activo)
- Generación automática de orden de compra cuando se alcanza punto de reorden
- Integración con JDE: sincronización bidireccional con F4111 (Item Ledger)

```sql
CREATE TABLE MNT_CORE.T_MNT_REPUESTOS (
    ID_REPUESTO         NUMBER GENERATED ALWAYS AS IDENTITY,
    CODIGO_REPUESTO     VARCHAR2(30) NOT NULL,
    NOMBRE              VARCHAR2(200) NOT NULL,
    DESCRIPCION         VARCHAR2(1000),
    CATEGORIA           VARCHAR2(100),
    UNIDAD_MEDIDA       VARCHAR2(20),
    STOCK_MINIMO        NUMBER DEFAULT 0,
    STOCK_MAXIMO        NUMBER,
    PUNTO_REORDEN       NUMBER,
    COSTO_PROMEDIO      NUMBER(15,4),
    UBICACION_ALMACEN   VARCHAR2(100),               -- Pasillo-estante-nivel
    CODIGO_JDE          VARCHAR2(30),                -- Item Number en JDE
    RUTA_IMAGEN_S3      VARCHAR2(1000),
    ESTADO              VARCHAR2(20) DEFAULT 'ACTIVO',
    CONSTRAINT PK_MNT_REPUESTOS PRIMARY KEY (ID_REPUESTO)
);

CREATE TABLE MNT_CORE.T_MNT_ALMACENES (
    ID_ALMACEN          NUMBER GENERATED ALWAYS AS IDENTITY,
    NOMBRE              VARCHAR2(100) NOT NULL,
    ID_PLANTA           NUMBER NOT NULL,
    UBICACION           VARCHAR2(200),
    CONSTRAINT PK_MNT_ALMACENES PRIMARY KEY (ID_ALMACEN)
);

CREATE TABLE MNT_CORE.T_MNT_STOCK (
    ID_STOCK            NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_REPUESTO         NUMBER NOT NULL,
    ID_ALMACEN          NUMBER NOT NULL,
    CANTIDAD_DISPONIBLE NUMBER DEFAULT 0,
    CONSTRAINT PK_MNT_STOCK PRIMARY KEY (ID_STOCK),
    CONSTRAINT FK_MNT_STK_REP FOREIGN KEY (ID_REPUESTO) REFERENCES MNT_CORE.T_MNT_REPUESTOS(ID_REPUESTO),
    CONSTRAINT FK_MNT_STK_ALM FOREIGN KEY (ID_ALMACEN) REFERENCES MNT_CORE.T_MNT_ALMACENES(ID_ALMACEN),
    CONSTRAINT UK_MNT_STOCK UNIQUE (ID_REPUESTO, ID_ALMACEN)
);

CREATE TABLE MNT_CORE.T_MNT_MOVIMIENTOS_INV (
    ID_MOVIMIENTO       NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_REPUESTO         NUMBER NOT NULL,
    ID_ALMACEN          NUMBER NOT NULL,
    TIPO_MOVIMIENTO     VARCHAR2(20) NOT NULL,       -- ENTRADA, SALIDA, AJUSTE, TRANSFERENCIA
    MOTIVO              VARCHAR2(50),                -- COMPRA, CONSUMO_OT, DEVOLUCION, AJUSTE_FISICO
    CANTIDAD            NUMBER NOT NULL,
    COSTO_UNITARIO      NUMBER(15,4),
    ID_OT               NUMBER,                     -- Si es consumo por OT
    ID_ORDEN_COMPRA     NUMBER,                     -- Si es entrada por compra
    REFERENCIA          VARCHAR2(200),
    REGISTRADO_POR      VARCHAR2(100) NOT NULL,
    FECHA_MOVIMIENTO    TIMESTAMP DEFAULT SYSTIMESTAMP,
    CONSTRAINT PK_MNT_MOV_INV PRIMARY KEY (ID_MOVIMIENTO),
    CONSTRAINT FK_MNT_MOV_REP FOREIGN KEY (ID_REPUESTO) REFERENCES MNT_CORE.T_MNT_REPUESTOS(ID_REPUESTO)
);

-- Relación repuesto ↔ activo
CREATE TABLE MNT_CORE.T_MNT_ACTIVOS_REPUESTOS (
    ID_ACTIVO           NUMBER NOT NULL,
    ID_REPUESTO         NUMBER NOT NULL,
    CANTIDAD_RECOMENDADA NUMBER DEFAULT 1,
    NOTAS               VARCHAR2(500),
    CONSTRAINT PK_MNT_ACT_REP PRIMARY KEY (ID_ACTIVO, ID_REPUESTO),
    CONSTRAINT FK_MNT_AR_ACT FOREIGN KEY (ID_ACTIVO) REFERENCES MNT_CORE.T_MNT_ACTIVOS(ID_ACTIVO),
    CONSTRAINT FK_MNT_AR_REP FOREIGN KEY (ID_REPUESTO) REFERENCES MNT_CORE.T_MNT_REPUESTOS(ID_REPUESTO)
);
```

### 4.2 Módulo: Mano de obra y planificador

**Propósito**: Gestionar el equipo técnico, sus especialidades, disponibilidad, y la planificación visual de actividades.

```sql
CREATE TABLE MNT_CORE.T_MNT_TECNICOS (
    ID_TECNICO          NUMBER GENERATED ALWAYS AS IDENTITY,
    CODIGO_EMPLEADO     VARCHAR2(30),               -- Mapeo con JDE/RRHH
    NOMBRE_COMPLETO     VARCHAR2(200) NOT NULL,
    EMAIL               VARCHAR2(200),
    TELEFONO            VARCHAR2(30),
    ID_PLANTA           NUMBER NOT NULL,
    ESPECIALIDAD        VARCHAR2(100),               -- Mecánico, Eléctrico, Instrumentista, etc.
    NIVEL               VARCHAR2(20),                -- JUNIOR, SENIOR, ESPECIALISTA
    COSTO_HORA          NUMBER(10,2),
    TURNO_DEFAULT       VARCHAR2(20),                -- MAÑANA, TARDE, NOCHE
    ESTADO              VARCHAR2(20) DEFAULT 'ACTIVO',
    ES_LIDER            CHAR(1) DEFAULT 'N',
    USUARIO_APEX        VARCHAR2(100),               -- Para login en la app
    CONSTRAINT PK_MNT_TECNICOS PRIMARY KEY (ID_TECNICO)
);

-- Disponibilidad / calendario del técnico
CREATE TABLE MNT_CORE.T_MNT_TECNICOS_DISPONIBILIDAD (
    ID_DISPONIBILIDAD   NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_TECNICO          NUMBER NOT NULL,
    FECHA               DATE NOT NULL,
    TIPO                VARCHAR2(20) NOT NULL,       -- DISPONIBLE, VACACIONES, PERMISO, CAPACITACION
    TURNO               VARCHAR2(20),
    NOTAS               VARCHAR2(200),
    CONSTRAINT PK_MNT_TEC_DISP PRIMARY KEY (ID_DISPONIBILIDAD),
    CONSTRAINT FK_MNT_TD_TEC FOREIGN KEY (ID_TECNICO) REFERENCES MNT_CORE.T_MNT_TECNICOS(ID_TECNICO)
);
```

**Planificador visual**: Página APEX con componente Calendar que muestre las OTs planificadas en formato agenda por técnico, permitiendo drag-and-drop para reasignar fechas y responsables.

### 4.3 Módulo: Historiales y auditoría

**Propósito**: Registro inmutable de todas las acciones realizadas en el sistema para transparencia, trazabilidad, resolución de disputas y soporte a auditorías ISO/regulatorias.

```sql
CREATE TABLE MNT_CORE.T_MNT_LOG_AUDITORIA (
    ID_LOG              NUMBER GENERATED ALWAYS AS IDENTITY,
    TABLA_AFECTADA      VARCHAR2(100) NOT NULL,
    ID_REGISTRO         NUMBER NOT NULL,
    ACCION              VARCHAR2(20) NOT NULL,       -- INSERT, UPDATE, DELETE, CAMBIO_ESTADO
    CAMPO_MODIFICADO    VARCHAR2(100),
    VALOR_ANTERIOR      VARCHAR2(4000),
    VALOR_NUEVO         VARCHAR2(4000),
    USUARIO             VARCHAR2(100) NOT NULL,
    FECHA               TIMESTAMP DEFAULT SYSTIMESTAMP,
    IP_ORIGEN           VARCHAR2(50),
    DETALLE             VARCHAR2(4000),
    CONSTRAINT PK_MNT_LOG PRIMARY KEY (ID_LOG)
);
```

Se implementa mediante triggers `AFTER INSERT/UPDATE/DELETE` en las tablas principales, o alternativamente mediante procedimientos en el paquete `MNT_PKG` que registran cada operación.

### 4.4 Módulo: KPIs y reportes

**Indicadores clave de rendimiento**:

| KPI | Fórmula | Meta clase mundial |
|---|---|---|
| **MTBF** (Mean Time Between Failures) | Tiempo total de operación / Número de fallas | Lo más alto posible |
| **MTTR** (Mean Time To Repair) | Tiempo total de reparación / Número de fallas | Lo más bajo posible |
| **OEE** (Overall Equipment Effectiveness) | Disponibilidad × Rendimiento × Calidad | ≥ 85% |
| **PMP** (Porcentaje de Mtto. Planificado) | Horas planificadas / Horas totales de Mtto. × 100 | ≥ 90% |
| **Cumplimiento de schedule** | OTs completadas a tiempo / OTs programadas × 100 | ≥ 85% |
| **Backlog** | OTs abiertas / Capacidad semanal del equipo | 2-4 semanas |
| **Costo de Mtto. por activo** | Costo total Mtto. / Valor reposición del activo × 100 | ≤ 6% |
| **Rotación de inventario** | Costo de repuestos consumidos / Valor promedio de inventario | Según industria |

**Implementación**: Vistas materializadas o funciones en `MNT_PKG` que calculan los KPIs por activo, por área, por planta, y global. Dashboard en APEX con gráficos interactivos (APEX Charts / Oracle JET).

---

## 5. FASE 3 — Escalabilidad (Detalle)

### 5.1 Módulo: Compras

**Propósito**: Gestionar el ciclo completo de adquisición de repuestos, desde la solicitud hasta la recepción, con integración a JDE para la generación de órdenes de compra.

**Flujo**: Necesidad detectada (stock bajo o requerimiento de OT) → Solicitud de compra → Aprobación → Orden de compra → Recepción → Ingreso a inventario.

```sql
CREATE TABLE MNT_CORE.T_MNT_ORDENES_COMPRA (
    ID_ORDEN_COMPRA     NUMBER GENERATED ALWAYS AS IDENTITY,
    NUMERO_OC           VARCHAR2(20) NOT NULL,
    ESTADO              VARCHAR2(20) DEFAULT 'BORRADOR',-- BORRADOR, PENDIENTE_APROBACION, APROBADA, ENVIADA, RECIBIDA_PARCIAL, RECIBIDA, CANCELADA
    FECHA_CREACION      TIMESTAMP DEFAULT SYSTIMESTAMP,
    FECHA_APROBACION    TIMESTAMP,
    FECHA_RECEPCION     TIMESTAMP,
    PROVEEDOR_NOMBRE    VARCHAR2(200),
    PROVEEDOR_CONTACTO  VARCHAR2(200),
    MONTO_TOTAL         NUMBER(15,2),
    NUMERO_OC_JDE       VARCHAR2(30),               -- Referencia cruzada con JDE
    NOTAS               VARCHAR2(4000),
    CREADO_POR          VARCHAR2(100) NOT NULL,
    APROBADO_POR        VARCHAR2(100),
    CONSTRAINT PK_MNT_OC PRIMARY KEY (ID_ORDEN_COMPRA)
);

CREATE TABLE MNT_CORE.T_MNT_OC_DETALLE (
    ID_OC_DETALLE       NUMBER GENERATED ALWAYS AS IDENTITY,
    ID_ORDEN_COMPRA     NUMBER NOT NULL,
    ID_REPUESTO         NUMBER NOT NULL,
    CANTIDAD_SOLICITADA NUMBER NOT NULL,
    CANTIDAD_RECIBIDA   NUMBER DEFAULT 0,
    COSTO_UNITARIO      NUMBER(15,4),
    COSTO_TOTAL         NUMBER(15,2) GENERATED ALWAYS AS (CANTIDAD_SOLICITADA * COSTO_UNITARIO) VIRTUAL,
    CONSTRAINT PK_MNT_OC_DET PRIMARY KEY (ID_OC_DETALLE),
    CONSTRAINT FK_MNT_OCD_OC FOREIGN KEY (ID_ORDEN_COMPRA) REFERENCES MNT_CORE.T_MNT_ORDENES_COMPRA(ID_ORDEN_COMPRA),
    CONSTRAINT FK_MNT_OCD_REP FOREIGN KEY (ID_REPUESTO) REFERENCES MNT_CORE.T_MNT_REPUESTOS(ID_REPUESTO)
);
```

### 5.2 Módulo: Organizaciones multi-planta

**Propósito**: Segregar datos por país/planta manteniendo administración centralizada. Esencial para la operación multi-país de Zaimella.

**Estrategia de segregación**: Oracle Row-Level Security (VPD - Virtual Private Database) basado en la planta del usuario logueado, o alternativamente, filtrado por aplicación APEX usando `APP_USER` → planta asignada.

```sql
CREATE TABLE MNT_CORE.T_MNT_PLANTAS (
    ID_PLANTA           NUMBER GENERATED ALWAYS AS IDENTITY,
    CODIGO_PLANTA       VARCHAR2(10) NOT NULL,       -- EC01, PE01, GT01
    NOMBRE              VARCHAR2(200) NOT NULL,
    PAIS                VARCHAR2(50) NOT NULL,
    CIUDAD              VARCHAR2(100),
    DIRECCION           VARCHAR2(500),
    ZONA_HORARIA        VARCHAR2(50),
    MONEDA              VARCHAR2(3),                 -- USD, PEN, GTQ
    ESTADO              VARCHAR2(20) DEFAULT 'ACTIVA',
    CONSTRAINT PK_MNT_PLANTAS PRIMARY KEY (ID_PLANTA)
);

CREATE TABLE MNT_CORE.T_MNT_USUARIOS_PLANTAS (
    ID_USUARIO_PLANTA   NUMBER GENERATED ALWAYS AS IDENTITY,
    USUARIO_APEX        VARCHAR2(100) NOT NULL,
    ID_PLANTA           NUMBER NOT NULL,
    ROL                 VARCHAR2(50) NOT NULL,       -- ADMIN, PLANIFICADOR, TECNICO, SOLICITANTE, CONSULTA
    CONSTRAINT PK_MNT_USR_PL PRIMARY KEY (ID_USUARIO_PLANTA),
    CONSTRAINT FK_MNT_UP_PL FOREIGN KEY (ID_PLANTA) REFERENCES MNT_CORE.T_MNT_PLANTAS(ID_PLANTA)
);
```

### 5.3 Módulo: Dashboard ejecutivo

**Propósito**: Vista consolidada para gerencia con KPIs en tiempo real, tendencias y alertas.

**Componentes del dashboard**:

- Semáforo de KPIs principales (MTBF, MTTR, OEE, PMP) por planta
- Gráfico de tendencia de OTs: preventivas vs correctivas vs emergencia (últimos 12 meses)
- Top 10 activos con más fallas (Pareto)
- Top 10 causas de falla (Pareto)
- Backlog actual por área/planta
- Costos de mantenimiento: presupuesto vs real
- Cumplimiento del programa preventivo
- Mapa de calor: criticidad × frecuencia de falla

### 5.4 Módulo: Integraciones

**JD Edwards (prioridad)**:

- Lectura de activos fijos desde JDE hacia catálogo CMMS (sincronización inicial)
- Envío de costos de OT al módulo de costos JDE (F0911 - Account Ledger)
- Sincronización de inventario con F4111 (Item Ledger)
- Generación de OC en JDE vía BSSV cuando se aprueba en CMMS
- Lectura de datos de producción (unidades producidas) desde F4801 (Work Order Master) para disparo de mantenimiento por producción

**IoT (futuro)**:

- Recepción de datos de sensores vía API REST (endpoint en APEX)
- Almacenamiento en tabla de lecturas
- Evaluación automática de umbrales para generación de OT predictiva

**Notificaciones**:

- Email mediante APEX_MAIL o AWS SES
- Push notifications para la PWA
- Webhook genérico para integración con sistemas externos

---

## 6. Notificaciones y alertas

### 6.1 Eventos que generan notificación

| Evento | Destinatario | Canal |
|---|---|---|
| Nueva solicitud de mantenimiento | Administrador de Mtto. + técnicos del área | Email + Push |
| OT asignada a técnico | Técnico asignado | Push + Email |
| OT próxima a vencer (SLA) | Responsable de OT + supervisor | Push + Email |
| OT completada | Solicitante original (si aplica) | Email |
| Lectura fuera de rango | Administrador de Mtto. | Push + Email |
| Stock bajo punto de reorden | Responsable de almacén | Email |
| Plan de mantenimiento próximo a vencer | Planificador | Push |
| OT no ejecutada en fecha programada (backlog) | Supervisor | Email diario resumen |

---

## 7. Seguridad y roles

### 7.1 Roles del sistema

| Rol | Permisos |
|---|---|
| **ADMIN** | Todo: configuración, catálogos, reportes, gestión de usuarios |
| **PLANIFICADOR** | Crear/editar planes, programar OTs, gestionar calendario, reportes |
| **SUPERVISOR** | Ver todo, aprobar solicitudes, cerrar OTs, reportes |
| **TECNICO** | Ver OTs asignadas, ejecutar checklist, registrar lecturas, consumir repuestos |
| **ALMACENERO** | Gestionar inventario, recibir compras, registrar movimientos |
| **SOLICITANTE** | Crear solicitudes, ver estado de sus solicitudes, evaluar servicio |
| **CONSULTA** | Solo lectura en todo el sistema |

### 7.2 Consideraciones de seguridad

- Autenticación mediante esquema APEX existente (Application Express Accounts o LDAP)
- Autorización por rol usando `APEX_AUTHORIZATION` o esquemas personalizados
- Auditoría de acceso en `T_MNT_LOG_AUDITORIA`
- Segregación de datos por planta (VPD o filtro APEX)
- Archivos en S3 con acceso mediante URLs pre-firmadas (no públicas)
- Cumplimiento con LOPDP (Ecuador) y Ley 29733 (Perú) para datos de empleados/técnicos

---

## 8. PWA para técnicos móviles

### 8.1 Funcionalidades móviles (APEX 24 PWA)

- Login con credenciales APEX
- Ver OTs asignadas con priorización visual
- Ejecutar checklist de tareas (marcar completadas)
- Registrar horas trabajadas (temporizador o ingreso manual)
- Registrar repuestos consumidos
- Tomar fotos y adjuntar a la OT
- Escanear código QR de activos
- Registrar lecturas y mediciones
- Recibir notificaciones push de nuevas asignaciones
- Modo offline básico (caché de OTs asignadas, sincronización al reconectar)

---

## 9. Datos semilla / catálogos iniciales

### 9.1 Estados de OT predeterminados

```sql
INSERT INTO T_MNT_ESTADOS_OT (NOMBRE, CODIGO, COLOR_HEX, ORDEN_KANBAN, ES_ESTADO_FINAL)
VALUES ('Creada', 'CREADA', '#6B7280', 1, 'N');
INSERT INTO T_MNT_ESTADOS_OT (NOMBRE, CODIGO, COLOR_HEX, ORDEN_KANBAN, ES_ESTADO_FINAL)
VALUES ('Planificada', 'PLANIFICADA', '#3B82F6', 2, 'N');
INSERT INTO T_MNT_ESTADOS_OT (NOMBRE, CODIGO, COLOR_HEX, ORDEN_KANBAN, ES_ESTADO_FINAL)
VALUES ('En ejecución', 'EN_EJECUCION', '#F59E0B', 3, 'N');
INSERT INTO T_MNT_ESTADOS_OT (NOMBRE, CODIGO, COLOR_HEX, ORDEN_KANBAN, ES_ESTADO_FINAL)
VALUES ('En espera', 'EN_ESPERA', '#EF4444', 4, 'N');
INSERT INTO T_MNT_ESTADOS_OT (NOMBRE, CODIGO, COLOR_HEX, ORDEN_KANBAN, ES_ESTADO_FINAL)
VALUES ('Completada', 'COMPLETADA', '#10B981', 5, 'N');
INSERT INTO T_MNT_ESTADOS_OT (NOMBRE, CODIGO, COLOR_HEX, ORDEN_KANBAN, ES_ESTADO_FINAL)
VALUES ('Cerrada', 'CERRADA', '#059669', 6, 'S');
INSERT INTO T_MNT_ESTADOS_OT (NOMBRE, CODIGO, COLOR_HEX, ORDEN_KANBAN, ES_ESTADO_FINAL)
VALUES ('Cancelada', 'CANCELADA', '#9CA3AF', 7, 'S');
```

### 9.2 Prioridades predeterminadas

```sql
INSERT INTO T_MNT_PRIORIDADES (NOMBRE, NIVEL, COLOR_HEX, TIEMPO_RESPUESTA_HRS)
VALUES ('Crítica', 1, '#DC2626', 2);
INSERT INTO T_MNT_PRIORIDADES (NOMBRE, NIVEL, COLOR_HEX, TIEMPO_RESPUESTA_HRS)
VALUES ('Alta', 2, '#F59E0B', 8);
INSERT INTO T_MNT_PRIORIDADES (NOMBRE, NIVEL, COLOR_HEX, TIEMPO_RESPUESTA_HRS)
VALUES ('Media', 3, '#3B82F6', 24);
INSERT INTO T_MNT_PRIORIDADES (NOMBRE, NIVEL, COLOR_HEX, TIEMPO_RESPUESTA_HRS)
VALUES ('Baja', 4, '#6B7280', 72);
```

### 9.3 Tipos de tarea predeterminados

```sql
-- INSPECCION, AJUSTE, LUBRICACION, CAMBIO, LIMPIEZA, MEDICION, CALIBRACION, REPARACION
```

### 9.4 Causas de falla comunes (manufactura de pañales)

```sql
-- Desgaste natural, Falta de lubricación, Sobrecarga, Error operativo,
-- Falla eléctrica, Falla neumática, Desalineación, Vibración excesiva,
-- Contaminación, Corrosión, Fatiga de material, Falla de sensor,
-- Obstrucción, Temperatura excesiva, Presión anormal
```

---

## 10. Resumen de objetos de base de datos

### 10.1 Tablas por módulo

| Módulo | Tablas | Fase |
|---|---|---|
| Catálogo de activos | `T_MNT_ACTIVOS`, `T_MNT_ACTIVOS_ARCHIVOS`, `T_MNT_TIPOS_ACTIVO`, `T_MNT_ESTADOS_ACTIVO` | 1 |
| Planes de mantenimiento | `T_MNT_PLANES`, `T_MNT_PLANES_ACTIVOS`, `T_MNT_PLANES_TAREAS`, `T_MNT_PLANES_RECURSOS` | 1 |
| Lecturas y mediciones | `T_MNT_TIPOS_LECTURA`, `T_MNT_ACTIVOS_LECTURAS_CONFIG`, `T_MNT_LECTURAS` | 1 |
| Órdenes de trabajo | `T_MNT_ORDENES_TRABAJO`, `T_MNT_ESTADOS_OT`, `T_MNT_TRANSICIONES_OT`, `T_MNT_OT_TECNICOS`, `T_MNT_OT_TAREAS`, `T_MNT_OT_REPUESTOS`, `T_MNT_OT_ARCHIVOS`, `T_MNT_PRIORIDADES`, `T_MNT_CAUSAS_FALLA`, `T_MNT_TIPOS_FALLA` | 1 |
| Solicitudes | `T_MNT_SOLICITUDES` | 1 |
| Inventario | `T_MNT_REPUESTOS`, `T_MNT_ALMACENES`, `T_MNT_STOCK`, `T_MNT_MOVIMIENTOS_INV`, `T_MNT_ACTIVOS_REPUESTOS` | 2 |
| Mano de obra | `T_MNT_TECNICOS`, `T_MNT_TECNICOS_DISPONIBILIDAD` | 2 |
| Historiales | `T_MNT_LOG_AUDITORIA` | 2 |
| Compras | `T_MNT_ORDENES_COMPRA`, `T_MNT_OC_DETALLE` | 3 |
| Organizaciones | `T_MNT_PLANTAS`, `T_MNT_USUARIOS_PLANTAS` | 3 |

**Total**: ~30 tablas en el schema `MNT_CORE`.

### 10.2 Paquetes PL/SQL en MNT_PKG

| Paquete | Propósito |
|---|---|
| `MNT_PKG.PKG_ACTIVOS` | CRUD de activos, generación de QR, árbol jerárquico |
| `MNT_PKG.PKG_PLANES` | CRUD de planes, motor de programación automática |
| `MNT_PKG.PKG_OT` | CRUD de OTs, cambios de estado con validación, cálculo de costos |
| `MNT_PKG.PKG_SOLICITUDES` | CRUD de solicitudes, generación de OT desde solicitud |
| `MNT_PKG.PKG_LECTURAS` | Registro de lecturas, evaluación de umbrales, alertas |
| `MNT_PKG.PKG_INVENTARIO` | Movimientos de inventario, kardex, reorden automático |
| `MNT_PKG.PKG_KPI` | Cálculo de MTBF, MTTR, OEE, PMP y demás indicadores |
| `MNT_PKG.PKG_NOTIFICACIONES` | Despacho de emails y push notifications |
| `MNT_PKG.PKG_AUDITORIA` | Registro de eventos en log de auditoría |
| `MNT_PKG.PKG_INTEGRACION_JDE` | Sincronización con tablas JDE vía DB links o BSSV |

### 10.3 Jobs Oracle (DBMS_SCHEDULER)

| Job | Frecuencia | Propósito |
|---|---|---|
| `JOB_PROGRAMAR_MTTO` | Diario 00:00 | Genera OTs preventivas según planes vencidos |
| `JOB_ALERTAS_LECTURAS` | Cada 15 min | Evalúa lecturas recientes contra umbrales |
| `JOB_NOTIF_BACKLOG` | Diario 07:00 | Envía resumen de OTs vencidas/backlog |
| `JOB_SYNC_JDE` | Diario 02:00 | Sincronización bidireccional con JDE |
| `JOB_REORDEN_STOCK` | Diario 06:00 | Verifica puntos de reorden y genera alertas/OC |

---

## 11. Aplicación APEX — Estructura de navegación

```
App CMMS Zaimella (APEX 24)
├─ Home / Dashboard
│    └─ Resumen KPIs, OTs pendientes, alertas activas
├─ Activos
│    ├─ Árbol jerárquico (Tree + Interactive Grid)
│    ├─ Ficha de activo (Form + Tabs: datos, planes, lecturas, historiales, archivos)
│    └─ Importación masiva (Excel upload)
├─ Planes de mantenimiento
│    ├─ Lista de planes (Interactive Grid)
│    ├─ Editor de plan (Form + región de tareas + recursos)
│    └─ Calendario de mantenimiento programado
├─ Órdenes de trabajo
│    ├─ Vista Kanban
│    ├─ Vista Lista (Interactive Grid con filtros)
│    ├─ Vista Calendario de recursos
│    ├─ Formulario de OT (Form + tabs: tareas, repuestos, técnicos, archivos)
│    └─ Impresión de OT (Classic Report / PDF)
├─ Solicitudes
│    ├─ Portal público de solicitudes (página pública, responsive)
│    ├─ Gestor de solicitudes (IR + flujo de aprobación)
│    └─ Seguimiento por código (página pública)
├─ Lecturas y mediciones
│    ├─ Registro de lecturas (Form rápido)
│    └─ Gráficas de tendencia por activo
├─ Inventario (Fase 2)
│    ├─ Catálogo de repuestos
│    ├─ Movimientos / Kardex
│    └─ Stock actual por almacén
├─ Reportes y KPIs (Fase 2)
│    ├─ Dashboard ejecutivo
│    ├─ MTBF / MTTR por activo
│    ├─ OEE por línea
│    ├─ Pareto de fallas
│    └─ Costos de mantenimiento
├─ Administración
│    ├─ Catálogos (tipos, estados, causas, prioridades)
│    ├─ Técnicos y especialidades
│    ├─ Plantas y organizaciones (Fase 3)
│    ├─ Usuarios y roles
│    └─ Configuración del sistema
└─ PWA (Progressive Web App para técnicos)
     ├─ Mis OTs
     ├─ Escanear QR
     ├─ Registrar lectura
     └─ Notificaciones
```

---

## 12. Criterios de aceptación del MVP (Fase 1)

1. Se puede registrar un activo con toda su información técnica y ubicarlo en la jerarquía de 4 niveles
2. Se puede crear un plan de mantenimiento preventivo con checklist de tareas y asignarlo a N activos
3. El motor de programación genera OTs automáticamente cuando un plan vence (por tiempo o lectura)
4. Se puede crear, asignar y completar una OT con flujo de estados configurable
5. Se puede registrar el consumo de repuestos y horas-hombre en una OT (sin integración con inventario formal)
6. Un empleado puede crear una solicitud de mantenimiento desde el portal público o escaneando un QR
7. El administrador puede convertir una solicitud en OT
8. Se pueden registrar lecturas de contadores/mediciones y visualizar tendencias
9. Se genera alerta cuando una lectura excede los umbrales configurados
10. Todas las acciones quedan registradas en el log de auditoría

---

*Documento generado como referencia de proyecto para Claude Code. Basado en análisis de MP Software (MPindustries), eMaint, MaintainX, Tractian, y estándares ISO/UNE-EN 15341 de indicadores de mantenimiento.*
