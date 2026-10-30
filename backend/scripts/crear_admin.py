"""
Script para crear un usuario admin en la base de datos
"""
from werkzeug.security import generate_password_hash
import psycopg2
import sys

# Configuración de la base de datos
DB_CONFIG = {
    'host': 'localhost',
    'database': 'INJUV',
    'user': 'postgres',
    'password': 'UTEM2022'
}

def crear_admin():
    """Crea un usuario admin si no existe"""
    try:
        # Conexión a la base de datos
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Datos del admin
        email = 'admin@injuv.cl'
        password = 'admin123'
        nombre = 'Admin'
        apellido = 'Sistema'
        rol = 'admin'

        # Verificar si el usuario ya existe
        cursor.execute("SELECT id FROM usuarios WHERE email = %s", (email,))
        existe = cursor.fetchone()

        if existe:
            print(f"El usuario {email} ya existe. Actualizando contraseña...")

            # Generar hash de la contraseña
            password_hash = generate_password_hash(password)

            # Actualizar contraseña y rol
            cursor.execute("""
                UPDATE usuarios
                SET password_hash = %s, rol = %s
                WHERE email = %s
            """, (password_hash, rol, email))

            print(f"Usuario {email} actualizado exitosamente.")
        else:
            print(f"Creando nuevo usuario admin...")

            # Generar hash de la contraseña
            password_hash = generate_password_hash(password)

            # Insertar nuevo usuario
            cursor.execute("""
                INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, created_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (nombre, apellido, email, password_hash, rol))

            print(f"Usuario admin creado exitosamente.")

        conn.commit()
        cursor.close()
        conn.close()

        print(f"\n=== CREDENCIALES DE ADMIN ===")
        print(f"Email: {email}")
        print(f"Contraseña: {password}")
        print(f"============================\n")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    crear_admin()
