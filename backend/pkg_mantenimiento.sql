CREATE OR REPLACE PACKAGE PKG_MANTENIMIENTO AS

  -- =========================================================================
  -- PAQUETE BASE DE MANTENIMIENTO ZAIMELLA
  -- Schema: DATA   Módulo: MTTO
  -- Toda la lógica de negocio reside aquí. El Front/API solo sirve de puente.
  -- =========================================================================

  -- ------------------------------------------
  -- MÓDULO: GESTIÓN DE ACTIVOS
  -- ------------------------------------------
  PROCEDURE prc_crear_activo (
    p_codigo_activo    IN  t_mtto_activos.codigo_activo%TYPE,
    p_nombre           IN  t_mtto_activos.nombre%TYPE,
    p_descripcion      IN  t_mtto_activos.descripcion%TYPE,
    p_id_tipo_activo   IN  t_mtto_activos.id_tipo_activo%TYPE,
    p_id_estado        IN  t_mtto_activos.id_estado%TYPE,
    p_id_planta        IN  t_mtto_activos.id_planta%TYPE,
    p_nivel_jerarquia  IN  t_mtto_activos.nivel_jerarquia%TYPE,
    p_creado_por       IN  t_mtto_activos.creado_por%TYPE,
    p_id_activo_out    OUT t_mtto_activos.id_activo%TYPE,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  );

  -- ------------------------------------------
  -- MÓDULO: LECTURA Y REGISTRO DE USO
  -- Registra horas/unidades en un punto de medición y propaga
  -- la lectura a todos los activos de la misma familia (mismo prefijo).
  -- ------------------------------------------
  PROCEDURE prc_registrar_lectura_uso (
    p_id_activo        IN  t_mtto_activos.id_activo%TYPE,
    p_valor_leido      IN  t_mtto_lecturas_uso.valor_leido%TYPE,
    p_registrado_por   IN  t_mtto_lecturas_uso.registrado_por%TYPE,
    p_activos_upd_out  OUT NUMBER,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  );

  -- ------------------------------------------
  -- MÓDULO: EJECUCIÓN DE PLANES Y OTs
  -- ------------------------------------------
  PROCEDURE prc_generar_ot_preventiva (
    p_id_plan          IN  t_mtto_planes.id_plan%TYPE,
    p_id_activo        IN  t_mtto_activos.id_activo%TYPE,
    p_generado_por     IN  VARCHAR2,
    p_id_ot_out        OUT t_mtto_ordenes_trabajo.id_ot%TYPE,
    p_numero_ot_out    OUT t_mtto_ordenes_trabajo.numero_ot%TYPE,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  );

  PROCEDURE prc_completar_tarea_checklist (
    p_id_checklist     IN  t_mtto_checklist_ot.id_checklist%TYPE,
    p_completado       IN  t_mtto_checklist_ot.completado%TYPE,
    p_valor_medido     IN  t_mtto_checklist_ot.valor_medido%TYPE,
    p_observacion      IN  t_mtto_checklist_ot.observacion_tecnico%TYPE,
    p_tecnico          IN  VARCHAR2,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  );

  -- ------------------------------------------
  -- MÓDULO: AVISOS CORRECTIVOS
  -- Aprueba una solicitud y genera automáticamente una OT correctiva.
  -- ------------------------------------------
  PROCEDURE prc_aprobar_solicitud (
    p_id_solicitud     IN  t_mtto_solicitudes.id_solicitud%TYPE,
    p_aprobado_por     IN  VARCHAR2,
    p_id_ot_out        OUT t_mtto_ordenes_trabajo.id_ot%TYPE,
    p_numero_ot_out    OUT t_mtto_ordenes_trabajo.numero_ot%TYPE,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  );

END PKG_MANTENIMIENTO;
/


CREATE OR REPLACE PACKAGE BODY PKG_MANTENIMIENTO AS

  -- =========================================================================
  -- PRIVADO: genera número de OT con formato OT-YYYY-NNNN usando secuencia
  -- =========================================================================
  FUNCTION fn_numero_ot RETURN VARCHAR2 IS
    v_seq NUMBER;
  BEGIN
    SELECT SQ_MTTO_ORDENES_TRABAJO.CURRVAL INTO v_seq FROM SYS.DUAL;
    RETURN 'OT-' || TO_CHAR(SYSDATE, 'YYYY') || '-' || LPAD(v_seq, 4, '0');
  EXCEPTION
    WHEN OTHERS THEN
      RETURN 'OT-' || TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS');
  END fn_numero_ot;

  -- =========================================================================
  -- prc_crear_activo
  -- =========================================================================
  PROCEDURE prc_crear_activo (
    p_codigo_activo    IN  t_mtto_activos.codigo_activo%TYPE,
    p_nombre           IN  t_mtto_activos.nombre%TYPE,
    p_descripcion      IN  t_mtto_activos.descripcion%TYPE,
    p_id_tipo_activo   IN  t_mtto_activos.id_tipo_activo%TYPE,
    p_id_estado        IN  t_mtto_activos.id_estado%TYPE,
    p_id_planta        IN  t_mtto_activos.id_planta%TYPE,
    p_nivel_jerarquia  IN  t_mtto_activos.nivel_jerarquia%TYPE,
    p_creado_por       IN  t_mtto_activos.creado_por%TYPE,
    p_id_activo_out    OUT t_mtto_activos.id_activo%TYPE,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  ) IS
  BEGIN
    p_codigo_error  := 0;
    p_mensaje_error := 'OK';

    INSERT INTO t_mtto_activos (
        codigo_activo, nombre, descripcion,
        id_tipo_activo, id_estado, id_planta,
        nivel_jerarquia, creado_por, fecha_creacion
    ) VALUES (
        p_codigo_activo, p_nombre, p_descripcion,
        p_id_tipo_activo, p_id_estado, p_id_planta,
        p_nivel_jerarquia, p_creado_por, SYSDATE
    ) RETURNING id_activo INTO p_id_activo_out;

    COMMIT;

  EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
      ROLLBACK;
      p_codigo_error  := -1;
      p_mensaje_error := 'Ya existe un activo con el código: ' || p_codigo_activo;
    WHEN OTHERS THEN
      ROLLBACK;
      p_codigo_error  := SQLCODE;
      p_mensaje_error := 'Error en prc_crear_activo: ' || SQLERRM;
  END prc_crear_activo;


  -- =========================================================================
  -- prc_registrar_lectura_uso
  -- Lógica: propaga la lectura a todos los activos de la familia (mismo prefijo
  -- de código) que tengan punto de medición, igual que el servicio Python.
  -- Valida que el activo padre no haya sido registrado el mismo día.
  -- =========================================================================
  PROCEDURE prc_registrar_lectura_uso (
    p_id_activo        IN  t_mtto_activos.id_activo%TYPE,
    p_valor_leido      IN  t_mtto_lecturas_uso.valor_leido%TYPE,
    p_registrado_por   IN  t_mtto_lecturas_uso.registrado_por%TYPE,
    p_activos_upd_out  OUT NUMBER,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  ) IS
    v_codigo_padre  t_mtto_activos.codigo_activo%TYPE;
    v_id_punto      t_mtto_puntos_medicion.id_punto%TYPE;
    v_ultima_fecha  DATE;
    v_count         NUMBER := 0;

    CURSOR c_familia (p_prefijo VARCHAR2) IS
      SELECT A.id_activo, PM.id_punto
        FROM t_mtto_activos        A
        JOIN t_mtto_puntos_medicion PM ON PM.id_activo = A.id_activo
       WHERE A.codigo_activo LIKE p_prefijo || '%';

  BEGIN
    p_codigo_error    := 0;
    p_mensaje_error   := 'OK';
    p_activos_upd_out := 0;

    -- Obtener código del activo padre
    SELECT codigo_activo INTO v_codigo_padre
      FROM t_mtto_activos
     WHERE id_activo = p_id_activo;

    -- Validar que el punto de medición del padre no haya sido registrado hoy
    BEGIN
      SELECT PM.id_punto INTO v_id_punto
        FROM t_mtto_puntos_medicion PM
       WHERE PM.id_activo = p_id_activo
         AND ROWNUM = 1;

      SELECT MAX(TRUNC(fecha_lectura)) INTO v_ultima_fecha
        FROM t_mtto_lecturas_uso
       WHERE id_punto = v_id_punto;

      IF v_ultima_fecha = TRUNC(SYSDATE) THEN
        p_codigo_error  := -1;
        p_mensaje_error := 'Este activo ya reportó horas operacionales el día de hoy.';
        RETURN;
      END IF;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN NULL; -- Sin punto de medición en padre, continuar
    END;

    -- Propagar lectura a toda la familia (activo + descendientes con el mismo prefijo)
    FOR r IN c_familia(v_codigo_padre) LOOP
      -- Actualizar valor acumulado
      UPDATE t_mtto_puntos_medicion
         SET valor_acumulado = valor_acumulado + p_valor_leido
       WHERE id_punto = r.id_punto;

      -- Insertar registro de lectura
      INSERT INTO t_mtto_lecturas_uso (
          id_punto, valor_leido, fecha_lectura, registrado_por
      ) VALUES (
          r.id_punto, p_valor_leido, SYSDATE, p_registrado_por
      );

      v_count := v_count + 1;
    END LOOP;

    p_activos_upd_out := v_count;
    COMMIT;

  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      ROLLBACK;
      p_codigo_error  := -2;
      p_mensaje_error := 'Activo ID ' || p_id_activo || ' no encontrado.';
    WHEN OTHERS THEN
      ROLLBACK;
      p_codigo_error  := SQLCODE;
      p_mensaje_error := 'Error en prc_registrar_lectura_uso: ' || SQLERRM;
  END prc_registrar_lectura_uso;


  -- =========================================================================
  -- prc_generar_ot_preventiva
  -- Crea la OT y copia automáticamente las tareas del plan al checklist.
  -- =========================================================================
  PROCEDURE prc_generar_ot_preventiva (
    p_id_plan          IN  t_mtto_planes.id_plan%TYPE,
    p_id_activo        IN  t_mtto_activos.id_activo%TYPE,
    p_generado_por     IN  VARCHAR2,
    p_id_ot_out        OUT t_mtto_ordenes_trabajo.id_ot%TYPE,
    p_numero_ot_out    OUT t_mtto_ordenes_trabajo.numero_ot%TYPE,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  ) IS
    v_nombre_plan   t_mtto_planes.nombre%TYPE;
    v_id_estado_ot  t_mtto_estados_ot.id_estado_ot%TYPE;
    v_id_prioridad  t_mtto_prioridades.id_prioridad%TYPE;
    v_numero_ot     t_mtto_ordenes_trabajo.numero_ot%TYPE;
    v_id_ot         t_mtto_ordenes_trabajo.id_ot%TYPE;

    CURSOR c_tareas IS
      SELECT secuencia, descripcion
        FROM t_mtto_tareas_plan
       WHERE id_plan = p_id_plan
       ORDER BY secuencia;

  BEGIN
    p_codigo_error  := 0;
    p_mensaje_error := 'OK';

    -- Obtener nombre del plan
    SELECT nombre INTO v_nombre_plan
      FROM t_mtto_planes
     WHERE id_plan = p_id_plan;

    -- Estado inicial: OPEN
    SELECT id_estado_ot INTO v_id_estado_ot
      FROM t_mtto_estados_ot
     WHERE codigo = 'OPEN'
       AND ROWNUM = 1;

    -- Prioridad: Alta (nivel 2) por defecto para preventivos
    SELECT id_prioridad INTO v_id_prioridad
      FROM t_mtto_prioridades
     WHERE nivel = 2
       AND ROWNUM = 1;

    -- Generar OT
    INSERT INTO t_mtto_ordenes_trabajo (
        numero_ot, tipo_ot, id_prioridad, id_estado_ot,
        id_activo, descripcion, fecha_programada,
        creado_por, fecha_creacion
    ) VALUES (
        'OT-PREV-' || TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS'),
        'PREVENTIVA',
        v_id_prioridad,
        v_id_estado_ot,
        p_id_activo,
        'Plan: ' || v_nombre_plan,
        SYSDATE,
        p_generado_por,
        SYSDATE
    ) RETURNING id_ot, numero_ot INTO v_id_ot, v_numero_ot;

    -- Copiar tareas del plan al checklist de la OT
    FOR t IN c_tareas LOOP
      INSERT INTO t_mtto_checklist_ot (
          id_ot, secuencia, descripcion, completado
      ) VALUES (
          v_id_ot, t.secuencia, t.descripcion, 'N'
      );
    END LOOP;

    COMMIT;

    p_id_ot_out     := v_id_ot;
    p_numero_ot_out := v_numero_ot;

  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      ROLLBACK;
      p_codigo_error  := -1;
      p_mensaje_error := 'Plan ID ' || p_id_plan || ' no encontrado o sin estado/prioridad configurada.';
    WHEN OTHERS THEN
      ROLLBACK;
      p_codigo_error  := SQLCODE;
      p_mensaje_error := 'Error en prc_generar_ot_preventiva: ' || SQLERRM;
  END prc_generar_ot_preventiva;


  -- =========================================================================
  -- prc_completar_tarea_checklist
  -- =========================================================================
  PROCEDURE prc_completar_tarea_checklist (
    p_id_checklist     IN  t_mtto_checklist_ot.id_checklist%TYPE,
    p_completado       IN  t_mtto_checklist_ot.completado%TYPE,
    p_valor_medido     IN  t_mtto_checklist_ot.valor_medido%TYPE,
    p_observacion      IN  t_mtto_checklist_ot.observacion_tecnico%TYPE,
    p_tecnico          IN  VARCHAR2,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  ) IS
    v_count NUMBER;
  BEGIN
    p_codigo_error  := 0;
    p_mensaje_error := 'OK';

    SELECT COUNT(*) INTO v_count
      FROM t_mtto_checklist_ot
     WHERE id_checklist = p_id_checklist;

    IF v_count = 0 THEN
      p_codigo_error  := -1;
      p_mensaje_error := 'Tarea de checklist ID ' || p_id_checklist || ' no encontrada.';
      RETURN;
    END IF;

    UPDATE t_mtto_checklist_ot
       SET completado          = p_completado,
           valor_medido        = p_valor_medido,
           observacion_tecnico = p_observacion
     WHERE id_checklist = p_id_checklist;

    COMMIT;

  EXCEPTION
    WHEN OTHERS THEN
      ROLLBACK;
      p_codigo_error  := SQLCODE;
      p_mensaje_error := 'Error en prc_completar_tarea_checklist: ' || SQLERRM;
  END prc_completar_tarea_checklist;


  -- =========================================================================
  -- prc_aprobar_solicitud
  -- Cambia estado de la solicitud a APROBADA y genera una OT correctiva.
  -- =========================================================================
  PROCEDURE prc_aprobar_solicitud (
    p_id_solicitud     IN  t_mtto_solicitudes.id_solicitud%TYPE,
    p_aprobado_por     IN  VARCHAR2,
    p_id_ot_out        OUT t_mtto_ordenes_trabajo.id_ot%TYPE,
    p_numero_ot_out    OUT t_mtto_ordenes_trabajo.numero_ot%TYPE,
    p_codigo_error     OUT NUMBER,
    p_mensaje_error    OUT VARCHAR2
  ) IS
    v_id_activo        t_mtto_solicitudes.id_activo%TYPE;
    v_descripcion      t_mtto_solicitudes.descripcion_falla%TYPE;
    v_prioridad_txt    t_mtto_solicitudes.prioridad_sugerida%TYPE;
    v_reportado_por    t_mtto_solicitudes.reportado_por%TYPE;
    v_id_prioridad     t_mtto_prioridades.id_prioridad%TYPE;
    v_id_estado_ot     t_mtto_estados_ot.id_estado_ot%TYPE;
    v_id_ot            t_mtto_ordenes_trabajo.id_ot%TYPE;
    v_numero_ot        t_mtto_ordenes_trabajo.numero_ot%TYPE;
    v_count            NUMBER;
  BEGIN
    p_codigo_error  := 0;
    p_mensaje_error := 'OK';

    -- Obtener datos de la solicitud
    SELECT id_activo, descripcion_falla, prioridad_sugerida, reportado_por
      INTO v_id_activo, v_descripcion, v_prioridad_txt, v_reportado_por
      FROM t_mtto_solicitudes
     WHERE id_solicitud = p_id_solicitud;

    -- Validar que no esté ya aprobada
    SELECT COUNT(*) INTO v_count
      FROM t_mtto_solicitudes
     WHERE id_solicitud = p_id_solicitud AND estado = 'APROBADA';

    IF v_count > 0 THEN
      p_codigo_error  := -1;
      p_mensaje_error := 'La solicitud ya fue aprobada anteriormente.';
      RETURN;
    END IF;

    -- Buscar prioridad por nombre (Alta/Media/Baja/Crítica)
    BEGIN
      SELECT id_prioridad INTO v_id_prioridad
        FROM t_mtto_prioridades
       WHERE UPPER(nombre) LIKE '%' || UPPER(v_prioridad_txt) || '%'
         AND ROWNUM = 1;
    EXCEPTION
      WHEN NO_DATA_FOUND THEN
        -- Fallback: prioridad Media
        SELECT id_prioridad INTO v_id_prioridad
          FROM t_mtto_prioridades
         WHERE nivel = 3 AND ROWNUM = 1;
    END;

    -- Estado inicial OPEN
    SELECT id_estado_ot INTO v_id_estado_ot
      FROM t_mtto_estados_ot
     WHERE codigo = 'OPEN' AND ROWNUM = 1;

    -- Crear OT correctiva
    INSERT INTO t_mtto_ordenes_trabajo (
        numero_ot, tipo_ot, id_prioridad, id_estado_ot,
        id_activo, descripcion, creado_por, fecha_creacion
    ) VALUES (
        'OT-CORR-' || TO_CHAR(SYSDATE, 'YYYYMMDDHH24MISS'),
        'CORRECTIVA',
        v_id_prioridad,
        v_id_estado_ot,
        v_id_activo,
        '[' || v_reportado_por || '] ' || v_descripcion,
        p_aprobado_por,
        SYSDATE
    ) RETURNING id_ot, numero_ot INTO v_id_ot, v_numero_ot;

    -- Actualizar solicitud
    UPDATE t_mtto_solicitudes
       SET estado         = 'APROBADA',
           id_ot_generada = v_id_ot
     WHERE id_solicitud = p_id_solicitud;

    COMMIT;

    p_id_ot_out     := v_id_ot;
    p_numero_ot_out := v_numero_ot;

  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      ROLLBACK;
      p_codigo_error  := -2;
      p_mensaje_error := 'Solicitud ID ' || p_id_solicitud || ' no encontrada.';
    WHEN OTHERS THEN
      ROLLBACK;
      p_codigo_error  := SQLCODE;
      p_mensaje_error := 'Error en prc_aprobar_solicitud: ' || SQLERRM;
  END prc_aprobar_solicitud;

END PKG_MANTENIMIENTO;
/
