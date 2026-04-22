import sys
import os

from sqlalchemy.schema import CreateTable
from sqlalchemy.dialects import oracle

# Agregar el directorio actual al path para poder importar models
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import Base, engine
from models import *

def generate_oracle_ddl():
    """
    Genera el script SQL de creación de objetos compatible con Oracle Database.
    """
    print("-- ==========================================================")
    print("-- SCRIPT DE CREACION DE BASE DE DATOS ORACLE - MANTENIMIENTO")
    print("-- ==========================================================\n")
    print("BEGIN")
    print("   -- Asegurar drop de tablas existentes (opcional)")
    print("   NULL;")
    print("END;")
    print("/\n")

    # Obtener todas las tablas ordenadas por dependencias
    tables = Base.metadata.sorted_tables
    
    for table in tables:
        print(f"-- == TABLA: {table.name.upper()} ==")
        # Compilar el comando DDL usando el dialecto de Oracle
        create_stmt = CreateTable(table).compile(dialect=oracle.dialect())
        
        # Procesar y limpiar la salida para un script bonito
        sql_string = str(create_stmt).strip()
        if not sql_string.endswith(";"):
            sql_string += ";"
            
        print(sql_string)
        print("\n")

if __name__ == "__main__":
    generate_oracle_ddl()
