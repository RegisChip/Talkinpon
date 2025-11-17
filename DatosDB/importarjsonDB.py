import json
import psycopg2
import os

# ------- CONFIGURACIÓN -------
DB_CONFIG = {
    "dbname": "TalkinponDB",
    "user": "postgres",
    "password": "R3g1nard-0710",
    "host": "localhost",
    "port": "5432"
}

JSON_FILE = r"C:/Users/leona/Documents/TEC/Ingenieria de Software/Talkinpon_3/DatosDB/relaciones.json"
# -----------------------------


# -----------------------------------------
# FUNCIÓN: Verificar si una tabla existe
# -----------------------------------------
def table_exists(cur, table_name):
    cur.execute("""
        SELECT EXISTS(
            SELECT 1 FROM information_schema.tables
            WHERE table_schema='public' AND table_name=%s
        );
    """, (table_name,))
    return cur.fetchone()[0]


# -----------------------------------------
# FUNCIÓN: Encontrar tabla real (con o sin guiones bajos)
# -----------------------------------------
def find_real_table_name(cur, name):
    name_clean = name.replace("_", "").lower()

    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema='public';
    """)
    all_tables = [t[0] for t in cur.fetchall()]

    # exacto
    if name.lower() in all_tables:
        return name.lower()

    # sin guiones bajos
    for tbl in all_tables:
        if tbl.replace("_", "").lower() == name_clean:
            return tbl

    return None


# -----------------------------------------
# LEER JSON
# -----------------------------------------
if not os.path.exists(JSON_FILE):
    print(f"❌ No se encontró el archivo {JSON_FILE}")
    exit(1)

with open(JSON_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

if isinstance(data, dict):
    data = [data]

# -----------------------------------------
# CONECTAR A POSTGRES
# -----------------------------------------
conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

# -----------------------------------------
# INSERTAR REGISTROS
# -----------------------------------------
for entry in data:
    model = entry.get("model")
    pk = entry.get("pk")
    fields = entry.get("fields", {})

    if not model:
        print("❌ ERROR: 'model' no está en el JSON.")
        continue

    raw_table = model.split(".")[1]  # ejemplo: mapa.edificio → edificio

    # Buscar nombre correcto en BD
    table = find_real_table_name(cur, raw_table)

    if not table:
        print(f"❌ La tabla '{raw_table}' no existe (ni con ni sin guiones bajos).")
        continue

    print(f"→ Insertando en tabla real: {table}")

    # Validar que exista
    if not table_exists(cur, table):
        print(f"❌ La tabla {table} no existe en la base de datos.")
        continue

    # -------- OBTENER PRIMARY KEY --------
    cur.execute("""
        SELECT a.attname
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        WHERE i.indrelid = %s::regclass AND i.indisprimary;
    """, (table,))

    pk_row = cur.fetchone()
    id_column = pk_row[0] if pk_row else None

    columns = []
    values = []
    placeholders = []

    # incluir PK si existe
    if pk is not None and id_column:
        columns.append(id_column)
        values.append(pk)
        placeholders.append("%s")

    # recorrer campos
    for key, value in fields.items():

        # columna exacta
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        """, (table, key))
        exists = cur.fetchone()

        if exists:
            columns.append(key)
            values.append(value)
            placeholders.append("%s")
            continue

        # foreign key
        fk = key + "_id"
        cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        """, (table, fk))
        exists_fk = cur.fetchone()

        if exists_fk:
            columns.append(fk)
            values.append(value)
            placeholders.append("%s")
        else:
            print(f"⚠ Campo ignorado: {key} (no existe en tabla {table})")

    # construir SQL
    sql = f"""
        INSERT INTO {table} ({", ".join(columns)})
        VALUES ({", ".join(placeholders)})
        ON CONFLICT ({id_column}) DO NOTHING;
    """

    try:
        cur.execute(sql, values)
        print(f"✔ Insertado en {table} PK={pk}")
    except Exception as e:
        print("❌ Error insertando:", e)
        print(sql)
        print(values)

# -----------------------------------------
# FINALIZAR
# -----------------------------------------
conn.commit()
cur.close()
conn.close()

print("\n✔ Importación finalizada correctamente.")
