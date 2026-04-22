from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

if settings.use_sqlite_demo:
    SQLALCHEMY_DATABASE_URL = "sqlite:///./demo_mantenimiento.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
else:
    SQLALCHEMY_DATABASE_URL = (
        f"oracle+oracledb://{settings.db_user}:{settings.db_password}@"
        f"{settings.db_host}:{settings.db_port}/?service_name={settings.db_service_name}"
    )
    engine = create_engine(SQLALCHEMY_DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
