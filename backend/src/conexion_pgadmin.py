"""
Script opcional para comprobar conectividad a PostgreSQL (misma BD que en ``app.py``).
Ejecutar desde ``backend/src``: ``python conexion_pgadmin.py``
"""
import psycopg2

connection = None
try:
    connection = psycopg2.connect(
        host="localhost",
        user="postgres",
        password="UTEM2022",
        database="INJUV",
    )
    print("Conexión exitosa")
    connection.cursor().execute("SELECT 1")
except Exception as ex:
    print(ex)
finally:
    if connection is not None:
        connection.close()
        print("Conexión cerrada")
