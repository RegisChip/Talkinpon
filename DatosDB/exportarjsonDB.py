import json
import psycopg2
import datetime
import os
# ------- CONFIGURACIÓN -------
DB_CONFIG = {
    "dbname": "TalkinponDB",
    "user": "postgres",
    "password": "3118Ch$",
    "host": "localhost",
    "port": "5432"
}

TABLE_NAME = "ubicaciones_relacion_u"  # ← nombre de la tabla que quieres exportar
JSON_FILE = r"C:\Talkin_HELP\Talk-last-version\Talkinpon\DatosDB\relaciones.json"
# -----------------------------

# -----------------------------------------
# CONECTAR A POSTGRES
# -----------------------------------------
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

# -----------------------------------------
# VALIDAR TABLA
# -----------------------------------------
cur.execute("""
    SELECT EXISTS(
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema='public' AND table_name=%s
    );
""", (TABLE_NAME,))
if not cur.fetchone()[0]:
    print(f"❌ La tabla '{TABLE_NAME}' no existe en la base de datos.")
    exit(1)

# -----------------------------------------
# OBTENER PRIMARY KEY
# -----------------------------------------
cur.execute("""
    SELECT a.attname
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = %s::regclass AND i.indisprimary;
""", (TABLE_NAME,))
pk_row = cur.fetchone()
id_column = pk_row[0] if pk_row else None

# -----------------------------------------
# OBTENER COLUMNAS
# -----------------------------------------
cur.execute("""
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = %s;
""", (TABLE_NAME,))
columns = [c[0] for c in cur.fetchall()]

# -----------------------------------------
# OBTENER DATOS
# -----------------------------------------
cur.execute(f"SELECT {', '.join(columns)} FROM {TABLE_NAME};")
rows = cur.fetchall()

# -----------------------------------------
# CONVERTIR A JSON ESTILO "Django"
# -----------------------------------------
json_data = []

for row in rows:
    entry = {}
    entry["model"] = f"mapa.{TABLE_NAME}"  # puedes ajustar el prefijo
    entry["pk"] = row[columns.index(id_column)] if id_column else None
    entry["fields"] = {}

    for i, col in enumerate(columns):
        if col != id_column:
            entry["fields"][col] = row[i]
    json_data.append(entry)

# -----------------------------------------
# GUARDAR JSON
# -----------------------------------------
with open(JSON_FILE, "w", encoding="utf-8") as f:
    json.dump(
        json_data, 
        f, 
        ensure_ascii=False, 
        indent=4,
        default=lambda o: o.isoformat() if isinstance(o, (datetime.datetime, datetime.date)) else str(o)
    )

# -----------------------------------------
# FINALIZAR
# -----------------------------------------
cur.close()
conn.close()

print(f"✔ Exportación finalizada: {JSON_FILE}")
