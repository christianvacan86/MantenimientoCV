from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Base de datos ─────────────────────────────────────────
    db_user: str = "MNT_CORE"
    db_password: str = "zaimella"
    db_host: str = "localhost"
    db_port: str = "1521"
    db_service_name: str = "ORCL"
    use_sqlite_demo: bool = True

    # ── SSO / Módulo ─────────────────────────────────────────
    # Código del módulo en T_ADMI_MODULO — único valor a cambiar por app
    module_code: str = "MTTO"

    # Validar sesión contra APEX_WORKSPACE_SESSIONS (false solo para dev local)
    apex_validate_session: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
