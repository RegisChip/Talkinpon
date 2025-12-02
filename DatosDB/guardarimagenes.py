import psycopg2

def guardar_imagen(ruta_imagen, id_edificio):
    try:
        # 1️ Conexión a PostgreSQL
        conn = psycopg2.connect(
            dbname="TalkinponDB",
            user="postgres",
            password="chivas##2023",
            host="localhost",
            port="5432"
        )
        cursor = conn.cursor()

        # 2️ Leer imagen del disco
        with open(ruta_imagen, "rb") as file:
            binary_data = file.read()

        # 3️ Insertar o actualizar la imagen
        query = """
            UPDATE edificio
            SET imagen_edi = %s
            WHERE id_edificio = %s;
        """

        cursor.execute(query, (binary_data, id_edificio))
        conn.commit()

        print("Imagen guardada correctamente")

    except Exception as e:
        print("Error:", e)

    finally:
        cursor.close()
        conn.close()


# ✔ Llamada de ejemplo
#guardar_imagen("C:/Users/leona/Documents/TEC/Ingenieria de Software/Talkin_3/auditorio.jpeg", 54)
guardar_imagen("C:/Users/emili/Documents/Semestre6/Front_Talkinpon/Talkinpon/DatosDB/auditorio.jpeg", 54)