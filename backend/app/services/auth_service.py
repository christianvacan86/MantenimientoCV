from fastapi import HTTPException
from sqlalchemy import text

from app.config import settings

CODIGOMODULO = 'MTTO'

# Permisos de demostración: solo activos cuando USE_SQLITE_DEMO=true
DEMO_PERMISSIONS = {
    "DASHBOARD":    {"agregar": False, "guardar": False, "eliminar": False, "comentar": False, "imprimir": True,  "cancelar": False},
    "ACTIVOS":      {"agregar": True,  "guardar": True,  "eliminar": True,  "comentar": True,  "imprimir": True,  "cancelar": True},
    "PLANES":       {"agregar": True,  "guardar": True,  "eliminar": False, "comentar": True,  "imprimir": True,  "cancelar": True},
    "USO":          {"agregar": True,  "guardar": True,  "eliminar": False, "comentar": True,  "imprimir": True,  "cancelar": True},
    "PLANIFICADOR": {"agregar": False, "guardar": True,  "eliminar": False, "comentar": True,  "imprimir": True,  "cancelar": False},
    "OTS":          {"agregar": False, "guardar": True,  "eliminar": False, "comentar": True,  "imprimir": True,  "cancelar": False},
    "SOLICITUDES":  {"agregar": False, "guardar": True,  "eliminar": False, "comentar": True,  "imprimir": True,  "cancelar": True},
}


def _validate_apex_session(db, session_id: str, username: str) -> None:
    """
    Verifica que session_id sea una sesión APEX activa del usuario dado.
    Consulta APEX_WORKSPACE_SESSIONS (requiere GRANT SELECT al schema MNT_CORE).

    SQL para conceder acceso (ejecutar como SYS o administrador APEX):
        GRANT SELECT ON APEX_WORKSPACE_SESSIONS TO MNT_CORE;

    Lanza HTTP 401 si la sesión no existe, expiró o no pertenece al usuario.
    Lanza HTTP 500 si el schema no tiene permisos sobre la vista APEX.
    """
    try:
        row = db.execute(
            text("""
                SELECT USER_NAME
                  FROM APEX_WORKSPACE_SESSIONS
                 WHERE APEX_SESSION_ID          = TO_NUMBER(:sess)
                   AND UPPER(USER_NAME)         = UPPER(:usr)
                   AND SESSION_IDLE_TIMEOUT_ON  > SYSDATE
                   AND SESSION_LIFE_TIMEOUT_ON  > SYSDATE
            """),
            {"sess": session_id, "usr": username}
        ).fetchone()
    except Exception as e:
        err = str(e)
        # ORA-00942: tabla/vista no existe → falta el GRANT
        if "ORA-00942" in err or "942" in err:
            raise HTTPException(
                status_code=500,
                detail=(
                    "El schema no tiene acceso a APEX_WORKSPACE_SESSIONS. "
                    "Ejecutar como SYS: GRANT SELECT ON APEX_WORKSPACE_SESSIONS TO DATA;"
                )
            )
        # ORA-01722: APEX_SESSION_ID no es numérico → sess inventado
        if "ORA-01722" in err or "1722" in err:
            raise HTTPException(status_code=401, detail="Identificador de sesión inválido")
        raise HTTPException(status_code=500, detail=f"Error de validación de sesión: {err}")

    if not row:
        raise HTTPException(
            status_code=401,
            detail="Sesión APEX inválida, expirada o no corresponde al usuario"
        )


def verify_apex_session(session_id: str | None, username: str | None):
    if not session_id:
        raise HTTPException(status_code=401, detail="No se proporcionó sesión APEX")

    if not username:
        raise HTTPException(status_code=401, detail="No se proporcionó usuario")

    # ── Modo demo local (USE_SQLITE_DEMO=true) ──────────────────────────────
    if settings.use_sqlite_demo:
        return {
            "valid":       True,
            "username":    username,
            "nombre":      f"{username} (DEMO)",
            "id_rol":      0,
            "permissions": DEMO_PERMISSIONS,
        }

    # ── Modo Oracle real ────────────────────────────────────────────────────
    from database import SessionLocal
    db = SessionLocal()
    try:
        # 1. Validar que la sesión APEX sea real y esté activa
        if settings.apex_validate_session:
            _validate_apex_session(db, session_id, username)

        # 2a. Obtener nombre de display del usuario
        usr_row = db.execute(
            text("""
                SELECT NOMBRES || ' ' || APELLIDOS AS NOM
                  FROM VT_CORP_USUARIO
                 WHERE UPPER(NOMBREUSUARIO) = UPPER(:usr)
                   AND ESTADO = 1
            """),
            {"usr": username}
        ).fetchone()

        if not usr_row:
            raise HTTPException(
                status_code=403,
                detail=f"Usuario '{username}' no encontrado o inactivo"
            )

        nombre = usr_row[0]

        # 2b. Obtener rol asignado al usuario para el módulo MTTO
        rol_row = db.execute(
            text("""
                SELECT ID_ROL
                  FROM T_ADMI_ROLUSUARIO
                 WHERE UPPER(CODIGOUSUARIO) = UPPER(:usr)
                   AND CODIGOMODULO         = :modulo
                   AND ESTADO               = 1
            """),
            {"usr": username, "modulo": CODIGOMODULO}
        ).fetchone()

        if not rol_row:
            raise HTTPException(
                status_code=403,
                detail=f"Usuario '{username}' no tiene rol asignado en el módulo {CODIGOMODULO}"
            )

        id_rol = rol_row[0]

        # 3. Obtener permisos del rol para las páginas del módulo MTTO
        # Índices: 0=CODIGOACCION, 1=AGREGAR, 2=GUARDAR, 3=ELIMINAR,
        #          4=COMENTAR, 5=IMPRIMIR, 6=CANCELAR
        rows = db.execute(
            text("""
                SELECT X.CODIGOACCION,
                       X.AGREGAR,  X.GUARDAR,  X.ELIMINAR,
                       X.COMENTAR, X.IMPRIMIR, X.CANCELAR
                  FROM T_ADMI_ROLACCESOS   X
                  JOIN T_ADMI_MODULOPAGINA Y ON X.ID_MODULOPAGINA = Y.ID
                 WHERE Y.CODIGOMODULO = :modulo
                   AND X.ID_ROL      = :id_rol
                   AND X.ESTADO      = 1
                   AND Y.ESTADO      = 1
            """),
            {"modulo": CODIGOMODULO, "id_rol": id_rol}
        ).fetchall()

        if not rows:
            raise HTTPException(
                status_code=403,
                detail=f"El rol del usuario no tiene páginas configuradas en {CODIGOMODULO}"
            )

        permissions = {
            row[0]: {
                "agregar":  bool(row[1]),
                "guardar":  bool(row[2]),
                "eliminar": bool(row[3]),
                "comentar": bool(row[4]),
                "imprimir": bool(row[5]),
                "cancelar": bool(row[6]),
            }
            for row in rows
        }

        return {
            "valid":       True,
            "username":    username,
            "nombre":      nombre,
            "id_rol":      id_rol,
            "permissions": permissions,
        }
    finally:
        db.close()
