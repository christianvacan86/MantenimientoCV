from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    db_user: str = "MNT_CORE"
    db_password: str = "zaimella"
    db_host: str = "localhost"
    db_port: str = "1521"
    db_service_name: str = "ORCL"
    use_sqlite_demo: bool = True
    apex_validate_session: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
