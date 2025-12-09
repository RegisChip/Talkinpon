# Talkinpon/Chat/utils.py

'''
Utils.py es el archivo que define como es que se crea la respuesta para el usuario
'''

from .ollama_servidor import respuesta as ollama_respuesta
from .models import Contexto, Consulta
from .busqueda_semantica import obtener_buscador
from django.utils import timezone
from Ubicaciones.models import Edificio, Salon

import uuid
import re
import json

buscador = obtener_buscador()
conversaciones_activas = {}


# ==========================================
# MAPEO DE DEPARTAMENTOS DEL EDIFICIO A
# ==========================================
DEPARTAMENTOS_EDIFICIO_A = {
    # Departamentos y oficinas
    'caja': 'Caja',
    'control escolar': 'Control Escolar',
    'control': 'Control Escolar',
    'escolar': 'Control Escolar',
    'becas': 'Becas',
    'titulacion': 'Titulación',
    'titulación': 'Titulación',
    'certificacion': 'Certificación de Actas',
    'certificación': 'Certificación de Actas',
    'servicios escolares': 'Servicios Escolares',
    'servicios': 'Servicios Escolares',
    'enfermeria': 'Enfermería',
    'enfermería': 'Enfermería',
    'recursos humanos': 'Recursos Humanos',
    'rh': 'Recursos Humanos',
    'desarrollo academico': 'Desarrollo Académico',
    'desarrollo académico': 'Desarrollo Académico',
    'psicologia': 'Psicología',
    'psicología': 'Psicología',
    'comunicacion': 'Comunicación y Difusión',
    'comunicación': 'Comunicación y Difusión',
    'difusion': 'Comunicación y Difusión',
    'difusión': 'Comunicación y Difusión',
    'viaticos': 'Viáticos',
    'viáticos': 'Viáticos',
    'division de estudios': 'División de Estudios Profesionales',
    'división de estudios': 'División de Estudios Profesionales',
    'estudios profesionales': 'División de Estudios Profesionales',
    
    # Variantes comunes
    'pagar': 'Caja',
    'pagos': 'Caja',
    'comprobante': 'Caja',
    'beca': 'Becas',
    'titularme': 'Titulación',
    'titulo': 'Titulación',
    'título': 'Titulación',
    'acta': 'Certificación de Actas',
    'constancia': 'Servicios Escolares',
    'kardex': 'Servicios Escolares',
}

def detectar_consulta_departamento(mensaje):
    """
    Detecta si el mensaje pregunta sobre la ubicación de un departamento
    
    Returns:
        dict con 'es_departamento', 'departamento', 'origen_edificio' o None
    """
    msg_lower = mensaje.lower().strip()
    
    # Palabras clave para detectar consultas de ubicación
    keywords_ubicacion = [
        'donde esta', 'dónde está', 'donde está',
        'donde queda', 'dónde queda',
        'donde se encuentra', 'dónde se encuentra',
        'ubicacion de', 'ubicación de',
        'en donde', 'en dónde',
        'como llego a', 'cómo llego a',
        'como voy a', 'cómo voy a',
        'ir a', 'voy a',
        'encontrar', 'busco',
        'esta la', 'está la', 'esta el', 'está el',
        'queda la', 'queda el',
    ]
    
    if not any(keyword in msg_lower for keyword in keywords_ubicacion):
        return None
    
    # Buscar si menciona algún departamento
    departamento_encontrado = None
    nombre_oficial = None
    
    for keyword, nombre in DEPARTAMENTOS_EDIFICIO_A.items():
        if keyword in msg_lower:
            departamento_encontrado = keyword
            nombre_oficial = nombre
            break
    
    if not departamento_encontrado:
        return None
    
    # Detectar si menciona edificio de origen
    origen_edificio = None
    
    # Patrón: "desde el X", "estoy en el X", "vengo del X"
    match_origen = re.search(r'(?:desde|estoy\s+en|vengo\s+del?)\s+(?:el\s+)?(?:edificio\s+)?([a-z])\b', msg_lower)
    if match_origen:
        origen_edificio = match_origen.group(1).upper()
    
    return {
        'es_departamento': True,
        'departamento': nombre_oficial,
        'origen_edificio': origen_edificio,
        'mensaje_original': mensaje
    }


def construir_respuesta_departamento(info_depto, id_edificio_a=None):
    """
    Construye una respuesta informando que el departamento está en el Edificio A
    """
    departamento = info_depto['departamento']
    origen = info_depto.get('origen_edificio')
    
    if origen and origen != 'A':
        # Usuario viene de otro edificio - ofrecer ruta
        respuesta = {
            'tipo': 'departamento_con_ruta',
            'departamento': departamento,
            'origen_id': None,  # Se completará después
            'destino_id': id_edificio_a,
            'origen_nombre': origen,
            'destino_nombre': 'A',
            'mensaje': f"📍 {departamento} se encuentra en el Edificio A.\n\n🗺️ Te mostraré la ruta desde el edificio {origen}."
        }
    else:
        # Solo informa ubicación
        respuesta = f"📍 {departamento} se encuentra en el Edificio A.\n\n"
        respuesta += "El Edificio A (Edificio de Derecho) alberga los siguientes servicios:\n"
        respuesta += "• Caja\n• Control Escolar\n• Becas\n• Servicios Escolares\n"
        respuesta += "• Titulación\n• Certificación de Actas\n• Enfermería\n"
        respuesta += "• Recursos Humanos\n• Desarrollo Académico\n• Psicología"
    
    return respuesta

# ==========================================
# DETECCIÓN DE CONSULTAS SOBRE EDIFICIOS
# ==========================================
def detectar_consulta_edificio(mensaje):
    """
    Detecta si el mensaje pregunta sobre información de edificios
    
    Returns:
        dict con 'es_consulta_edificio', 'tipo', 'edificio_nombre', etc.
    """
    msg_lower = mensaje.lower().strip()
    
    # Palabras clave para detectar consultas sobre edificios
    # posible lista de preguntas
    keywords_edificio = [
        # ========== USO Y FUNCIÓN DEL EDIFICIO ==========
        'para que sirve', 'para qué sirve',
        'para que es', 'para qué es',
        'que se hace en', 'qué se hace en',
        'que hacen en', 'qué hacen en',
        'que hay en', 'qué hay en',
        'que tiene', 'qué tiene',
        'que contiene', 'qué contiene',
        'uso del edificio', 'uso de', 'uso del',
        'funcion del edificio', 'función del edificio',
        'funciona', 'sirve para',
        'se usa para', 'se utiliza para',
        'de que es', 'de qué es',
        'a que se dedica', 'a qué se dedica',
        'cual es su uso', 'cuál es su uso',
        'cual es la funcion', 'cuál es la función',
        
        # ========== CONTENIDO Y COMPONENTES ==========
        'que instalaciones', 'qué instalaciones',
        'que areas', 'qué áreas', 'qué areas',
        'que departamentos', 'qué departamentos',
        'que oficinas', 'qué oficinas',
        'que espacios', 'qué espacios',
        'cuantos salones', 'cuántos salones',
        'tiene salones', 'tiene aulas',
        'instalaciones del', 'instalaciones en',
        
        # ========== BAÑOS Y SANITARIOS ==========
        'donde hay baños', 'dónde hay baños',
        'donde hay baño', 'dónde hay baño',
        'baños en', 'baño en',
        'hay baños', 'hay baño',
        'tiene baños', 'tiene baño',
        'sanitarios en', 'sanitario en',
        'hay sanitarios', 'tiene sanitarios',
        'puedo ir al baño', 'ir al baño',
        'encuentro baños', 'encuentro baño',
        
        # ========== SALONES Y AULAS ==========
        'que salones', 'qué salones',
        'salones en', 'salones del',
        'cuales salones', 'cuáles salones',
        'lista de salones', 'listado de salones',
        'aulas en', 'aulas del',
        'que aulas', 'qué aulas',
        'cuantas aulas', 'cuántas aulas',
        'salon', 'salón',
        'aula',
        
        # ========== LABORATORIOS ==========
        'laboratorio', 'laboratorios',
        'labs en', 'labs del',
        'que laboratorios', 'qué laboratorios',
        'tiene laboratorios', 'tiene laboratorio',
        'hay laboratorios', 'hay laboratorio',
        'lab ', 'labs ',
        
        # ========== UBICACIÓN DE SALONES/ESPACIOS ==========
        'donde esta el salon', 'dónde está el salón',
        'donde queda el salon', 'dónde queda el salón',
        'donde encuentro el salon', 'dónde encuentro el salón',
        'ubicacion del salon', 'ubicación del salón',
        'en que edificio esta el salon', 'en qué edificio está el salón',
        'en que edificio queda', 'en qué edificio queda',
        'en que edificio se encuentra', 'en qué edificio se encuentra',
        'que edificio tiene', 'qué edificio tiene',
        
        # ========== UBICACIÓN GENERAL ==========
        'donde queda', 'dónde queda',
        'donde esta', 'dónde está', 'donde está',
        'donde se encuentra', 'dónde se encuentra',
        'en donde esta', 'en dónde está',
        'ubicacion del edificio', 'ubicación del edificio',
        'como se llama', 'cómo se llama',
        'nombre del edificio',
        
        # ========== BÚSQUEDA Y LOCALIZACIÓN ==========
        'busco el edificio', 'busco edificio',
        'encontrar el edificio', 'encontrar edificio',
        'localizar el edificio', 'localizar edificio',
        'cual edificio', 'cuál edificio',
        'en que edificio', 'en qué edificio',
        'que edificio', 'qué edificio',
        
        # ========== INFORMACIÓN GENERAL ==========
        'informacion del edificio', 'información del edificio',
        'informacion sobre el edificio', 'información sobre el edificio',
        'datos del edificio', 'datos sobre el edificio',
        'detalles del edificio', 'detalles sobre el edificio',
        'cuentame del edificio', 'cuéntame del edificio',
        'cuentame sobre el edificio', 'cuéntame sobre el edificio',
        'dime sobre el edificio', 'dime del edificio',
        'platícame del edificio', 'platicame del edificio',
        'explicame del edificio', 'explícame del edificio',
        
        # ========== PREGUNTAS DIRECTAS ==========
        'edificio', 'edificios',
        'el edificio ',
        'que onda con el edificio', 'qué onda con el edificio',
        'que pasa en el edificio', 'qué pasa en el edificio',
        'que rollo con el edificio', 'qué rollo con el edificio',
    ]
    
    if not any(keyword in msg_lower for keyword in keywords_edificio):
        return None
    
    # Detectar nombre del edificio
    edificio_nombre = None

    # Patron 1: edificio x
    match_edificio = re.search(r'edificio\s+([a-z])\b', msg_lower)
    if match_edificio:
        edificio_nombre = match_edificio.group(1).upper()
    
    # Patron 2: el X
    if not match_edificio:
        match_el = re.search(r'\bel\s+([a-z])\b', msg_lower)
        if match_el:
            edificio_nombre = match_el.group(1).upper()

    # Patron 3: letra sola en contexto
    if not edificio_nombre:
        match_contexto = re.search(r'\b(?:en|del|al)\s+([a-z])\b', msg_lower)
        if match_contexto:
            edificio_nombre = match_contexto.group(1).upper()

    # Patron 4: letra a; final de la pregunta
    if not edificio_nombre:
        match_final = re.search(r'\b([a-z])\s*\??$', msg_lower)
        if match_final:
            letra = match_final.group(1)
            # Verificar que no sea palabra común
            if letra not in ['a', 'o', 'y', 'e', 'u']:
                edificio_nombre = letra.upper()

    # Si no encontramos edificio, retornar None
    if not edificio_nombre:
        return None
    
    # Determinar tipo de consulta
    tipo = 'info_general'

    # Uso y función del edificio
    if any(keyword in msg_lower for keyword in [
        'para que sirve', 'para qué sirve', 'para que es', 'para qué es',
        'que se hace', 'qué se hace', 'que hacen', 'qué hacen',
        'uso', 'funcion', 'función', 'sirve para', 'se usa',
        'de que es', 'de qué es', 'a que se dedica', 'a qué se dedica'
    ]):
        tipo = 'uso_edificio'

    # Baños y sanitarios
    elif any(keyword in msg_lower for keyword in [
        'baño', 'baños', 'sanitario', 'sanitarios',
        'hay baño', 'hay baños', 'tiene baño', 'tiene baños'
    ]):
        tipo = 'baños'

    # Salones específicos o listado
    elif any(keyword in msg_lower for keyword in [
        'salon', 'salón', 'salones', 'aula', 'aulas'
    ]):
        # Detectar si pregunta por un salón específico
        match_salon = re.search(r'sal[oó]n\s+([a-z0-9]+)', msg_lower)
        if match_salon:
            return {
                'es_consulta_edificio': True,
                'tipo': 'salon_especifico',
                'salon_numero': match_salon.group(1).upper(),
                'mensaje_original': mensaje
            }
        else:
            tipo = 'salones_edificio'

    # Laboratorios
    elif any(keyword in msg_lower for keyword in [
        'laboratorio', 'laboratorios', 'lab ', 'labs '
    ]):
        tipo = 'laboratorios'

    # Contenido general
    elif any(keyword in msg_lower for keyword in [
        'que tiene', 'qué tiene', 'que hay', 'qué hay',
        'que contiene', 'qué contiene', 'instalaciones',
        'areas', 'áreas', 'departamentos', 'oficinas', 'espacios'
    ]):
        tipo = 'contenido_general'
    
    return {
        'es_consulta_edificio': True,
        'tipo': tipo,
        'edificio_nombre': edificio_nombre,
        'mensaje_original': mensaje
    }


def consultar_info_edificio(edificio_nombre):
    """
    Consulta la información de un edificio desde la BD
    
    Returns:
        dict con la información o None
    """
    try:
        edificio = Edificio.objects.filter(nombre__iexact=edificio_nombre).first()
        
        if not edificio:
            return None
        
        # Obtener salones del edificio
        salones = edificio.salones.all()
        lista_salones = [s.numero for s in salones]
        
        return {
            'nombre': edificio.nombre,
            'nombre_especial': edificio.nombre_especial or '',
            'uso': edificio.uso,
            'num_salones': edificio.num_salones,
            'salones': lista_salones[:10]  # Limitar a 10 para no saturar
        }
    
    except Exception as e:
        print(f"Error consultando edificio: {e}")
        return None


def consultar_salon_especifico(salon_numero):
    """
    Busca un salón específico y retorna su edificio
    
    Returns:
        dict con información del salón y edificio
    """
    try:
        salon = Salon.objects.filter(numero__iexact=salon_numero).first()
        
        if not salon:
            return None
        
        return {
            'salon_numero': salon.numero,
            'edificio_nombre': salon.edificio.nombre,
            'tipo': salon.tipo or 'salón',
            'capacidad': salon.capacidad
        }
    
    except Exception as e:
        print(f"Error consultando salón: {e}")
        return None


def construir_respuesta_edificio(info_edificio, tipo_consulta):
    """
    Construye una respuesta amigable con la info del edificio
    """
    if not info_edificio:
        return "Lo siento, no encontré información sobre ese edificio. ¿Podrías verificar el nombre?"
    
    nombre = info_edificio['nombre']
    uso = info_edificio.get('uso', 'No hay información disponible')
    
    # ========== USO DEL EDIFICIO ==========
    if tipo_consulta == 'uso_edificio':
        respuesta = f"📍 Edificio {nombre}\n\n"
        respuesta += f"{uso}\n\n"
        
        if info_edificio.get('nombre_especial'):
            respuesta += f"También conocido como: *{info_edificio['nombre_especial']}*\n\n"
        
        if info_edificio.get('num_salones', 0) > 0:
            respuesta += f"Este edificio cuenta con **{info_edificio['num_salones']} salones**."
        
        return respuesta
    
    # ========== BAÑOS ==========
    elif tipo_consulta == 'baños':
        if 'baño' in uso.lower() or 'sanitario' in uso.lower():
            respuesta = f"✅ Sí, el edificio {nombre} tiene baños.\n\n"
            respuesta += f"Información adicional: {uso}"
        else:
            respuesta = f"❌ No encontré información específica sobre baños en el edificio {nombre}.\n\n"
            respuesta += f"📋 Uso del edificio: {uso}"
        
        return respuesta
    
    # ========== SALONES DEL EDIFICIO ==========
    elif tipo_consulta == 'salones_edificio':
        respuesta = f"📚 Salones en el Edificio {nombre}\n\n"
        
        if info_edificio.get('salones') and len(info_edificio['salones']) > 0:
            salones_lista = ', '.join(info_edificio['salones'])
            respuesta += f"Salones: {salones_lista}\n\n"
            respuesta += f"Total: {info_edificio['num_salones']} salones"
        else:
            respuesta += "No encontré información detallada sobre salones específicos en este edificio."
            if info_edificio.get('num_salones', 0) > 0:
                respuesta += f"\n\nSin embargo, el edificio cuenta con {info_edificio['num_salones']} salones."
        
        return respuesta
    
    # ========== LABORATORIOS ==========
    elif tipo_consulta == 'laboratorios':
        if 'laboratorio' in uso.lower() or 'lab' in uso.lower():
            respuesta = f"🔬 Edificio {nombre} - Laboratorios\n\n"
            respuesta += f"{uso}\n\n"
            
            # Intentar extraer laboratorios específicos
            if info_edificio.get('salones'):
                labs = [s for s in info_edificio['salones'] if 'lab' in s.lower() or 'lc' in s.lower()]
                if labs:
                    respuesta += f"Laboratorios identificados: {', '.join(labs)}"
        else:
            respuesta = f"❌ No encontré información específica sobre laboratorios en el edificio {nombre}.\n\n"
            respuesta += f"📋 Uso del edificio: {uso}"
        
        return respuesta
    
    # ========== CONTENIDO GENERAL ==========
    elif tipo_consulta == 'contenido_general':
        respuesta = f"📍 Edificio {nombre}\n\n"
        respuesta += f"Uso: {uso}\n\n"
        
        if info_edificio.get('nombre_especial'):
            respuesta += f"También conocido como: {info_edificio['nombre_especial']}\n\n"
        
        if info_edificio.get('num_salones', 0) > 0:
            respuesta += f"Salones: {info_edificio['num_salones']}\n"
            
            if info_edificio.get('salones') and len(info_edificio['salones']) > 0:
                muestra_salones = info_edificio['salones'][:5]
                respuesta += f"Algunos: {', '.join(muestra_salones)}"
                if len(info_edificio['salones']) > 5:
                    respuesta += f" (y {len(info_edificio['salones']) - 5} más)"
        
        return respuesta
    
    # ========== INFO GENERAL (DEFAULT) ==========
    else:
        respuesta = f"📍 Edificio {nombre}\n\n"
        respuesta += f"{uso}\n\n"
        
        if info_edificio.get('nombre_especial'):
            respuesta += f"También conocido como: {info_edificio['nombre_especial']}*\n\n"
        
        if info_edificio.get('salones') and len(info_edificio['salones']) > 0:
            respuesta += f"Algunos salones: {', '.join(info_edificio['salones'][:5])}"
        
        return respuesta

def construir_respuesta_salon(info_salon):
    """
    Construye respuesta para consulta de salón específico
    """
    if not info_salon:
        return "Lo siento, no encontré ese salón. ¿Podrías verificar el número?"
    
    respuesta = f"📍 Salón {info_salon['salon_numero']}\n\n"
    respuesta += f"Se encuentra en el Edificio {info_salon['edificio_nombre']}\n\n"
    
    if info_salon.get('tipo'):
        respuesta += f"Tipo: {info_salon['tipo']}\n"
    
    if info_salon.get('capacidad'):
        respuesta += f"Capacidad: {info_salon['capacidad']} personas"
    
    return respuesta

# ==========================================
# DETECCIÓN Y EXTRACCIÓN DE RUTAS
# ==========================================
PATRONES_RUTA = [
    # Patrón: "estoy en X, como llego a Y" → origen=X, destino=Y
    r'estoy\s+en\s+(?:el\s+)?(?:edificio\s+)?([a-z]+).*?(?:como|cómo)\s+(?:llego|voy)\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+)',
    
    # Patrón: "como llego al Y desde X" → origen=X, destino=Y
    r'(?:como|cómo)\s+(?:llego|voy|puedo\s+(?:llegar|ir))\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+)(?:\s+(?:desde|de|estoy\s+en)\s+(?:el\s+)?(?:edificio\s+)?([a-z]+))?',
    
    # Patrón: "ruta del X al Y" → origen=X, destino=Y
    r'(?:ruta|camino)\s+del?\s+(?:edificio\s+)?([a-z]+)\s+al?\s+(?:edificio\s+)?([a-z]+)',
    
    # Patrón: "del X al Y" → origen=X, destino=Y
    r'del?\s+(?:edificio\s+)?([a-z]+)\s+al?\s+(?:edificio\s+)?([a-z]+)',
    
    # Patrón: "donde está X" (solo destino)
    r'(?:donde|dónde)\s+(?:esta|está|queda)\s+(?:el\s+)?(?:edificio\s+)?([a-z]+)',
]

def detectar_solicitud_ruta(mensaje):
    """
    Detecta si el mensaje es una solicitud de ruta
    ORDEN IMPORTANTE: Verificar patrones específicos primero
    
    Returns:
        dict con 'es_ruta', 'origen', 'destino' o None
    """
    msg_lower = mensaje.lower().strip()
    
    # Palabras clave que indican solicitud de ruta
    keywords_ruta = [
        # ========== MOVIMIENTO Y DIRECCIÓN ==========
        'como llego', 'cómo llego',
        'como voy', 'cómo voy',
        'como puedo ir', 'cómo puedo ir',
        'como llegar', 'cómo llegar',
        'como ir', 'cómo ir',
        'puedo ir',
        'me dirijo',
        'ir al', 'ir a',
        'voy al', 'voy a',
        'llegar al', 'llegar a',
        
        # ========== UBICACIÓN Y BÚSQUEDA ==========
        'donde esta', 'dónde está', 'donde está',
        'donde queda', 'dónde queda',
        'donde se encuentra', 'dónde se encuentra',
        'ubicacion', 'ubicación',
        'en donde', 'en dónde',
        'busco el', 'busco',
        'encontrar el', 'encontrar',
        'localizar',
        
        # ========== RUTA Y CAMINO ==========
        'ruta', 'rutas',
        'camino', 'caminos',
        'recorrido',
        'trayecto',
        'indicaciones',
        'direcciones',
        'guia', 'guía',
        'mapa',
        
        # ========== POSICIÓN ACTUAL ==========
        'estoy en',
        'me encuentro en',
        'mi ubicacion', 'mi ubicación',
        'desde el', 'desde',
        'vengo del', 'vengo de',
        'salgo del', 'salgo de',
        'parto del', 'parto de',
        
        # ========== DESTINO ==========
        'hacia el', 'hacia',
        'hasta el', 'hasta',
        'al edificio', 'a edificio',
        'del edificio', 'de edificio',
        
        # ========== COLOQUIAL/INFORMAL ==========
        'llevame', 'llévame',
        'llevame al', 'llévame al',
        'quiero ir',
        'necesito ir',
        'tengo que ir',
        'voy para',
        'me voy al',
        'ando buscando',
    ]
    
    if not any(keyword in msg_lower for keyword in keywords_ruta):
        return None
    
    # ========== ORDEN CORRECTO: DE MÁS ESPECÍFICO A MÁS GENERAL ==========
    
    # PATRÓN 1: "estoy en X ... como llego ... Y" (más específico)
    match_estoy_completo = re.search(
        r'estoy\s+en\s+(?:el\s+)?(?:edificio\s+)?([a-z]+).*?(?:como|cómo)\s+(?:llego|voy)\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+)',
        msg_lower
    )
    if match_estoy_completo:
        origen = match_estoy_completo.group(1).upper()
        destino = match_estoy_completo.group(2).upper()
        
        if validar_edificios(origen, destino):
            print(f"DETECTADO [estoy en X ... como llego Y]: origen={origen}, destino={destino}")
            return {
                'es_ruta': True,
                'origen': origen,
                'destino': destino,
                'mensaje_original': mensaje
            }
    
    # PATRÓN 2: "como llego ... Y ... desde X" (específico con desde)
    match_desde = re.search(
        r'(?:como|cómo)\s+(?:llego|voy)\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+).*?(?:desde|de)\s+(?:el\s+)?(?:edificio\s+)?([a-z]+)',
        msg_lower
    )
    if match_desde:
        destino = match_desde.group(1).upper()
        origen = match_desde.group(2).upper()
        
        if validar_edificios(origen, destino):
            print(f"DETECTADO [como llego Y desde X]: origen={origen}, destino={destino}")
            return {
                'es_ruta': True,
                'origen': origen,
                'destino': destino,
                'mensaje_original': mensaje
            }
    
    # PATRÓN 3: "como llego ... Y ... si estoy en X"
    match_si_estoy = re.search(
        r'(?:como|cómo)\s+(?:llego|voy)\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+).*?si\s+estoy\s+en\s+(?:el\s+)?(?:edificio\s+)?([a-z]+)',
        msg_lower
    )
    if match_si_estoy:
        destino = match_si_estoy.group(1).upper()
        origen = match_si_estoy.group(2).upper()
        
        if validar_edificios(origen, destino):
            print(f"DETECTADO [como llego Y si estoy en X]: origen={origen}, destino={destino}")
            return {
                'es_ruta': True,
                'origen': origen,
                'destino': destino,
                'mensaje_original': mensaje
            }
    
    # PATRÓN 4: "ruta del X al Y" o "del X al Y"
    match_del_al = re.search(
        r'(?:ruta\s+)?del?\s+(?:edificio\s+)?([a-z]+)\s+al?\s+(?:edificio\s+)?([a-z]+)',
        msg_lower
    )
    if match_del_al:
        origen = match_del_al.group(1).upper()
        destino = match_del_al.group(2).upper()
        
        if validar_edificios(origen, destino):
            print(f"DETECTADO [del X al Y]: origen={origen}, destino={destino}")
            return {
                'es_ruta': True,
                'origen': origen,
                'destino': destino,
                'mensaje_original': mensaje
            }
    
    # PATRÓN 5: "como llego al Y" (SOLO destino, origen=A por defecto) - MÁS GENERAL
    match_solo_destino = re.search(
        r'(?:como|cómo)\s+(?:llego|voy)\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+)',
        msg_lower
    )
    if match_solo_destino:
        destino = match_solo_destino.group(1).upper()
        origen = 'A'  # Por defecto
        
        if validar_edificios(origen, destino):
            print(f"DETECTADO [como llego Y]: origen={origen} (default), destino={destino}")
            return {
                'es_ruta': True,
                'origen': origen,
                'destino': destino,
                'mensaje_original': mensaje
            }
    
    # PATRÓN 6: "donde está X" (solo destino, origen = A por defecto)
    match_donde = re.search(
        r'(?:donde|dónde)\s+(?:esta|está|queda)\s+(?:el\s+)?(?:edificio\s+)?([a-z]+)',
        msg_lower
    )
    if match_donde:
        destino = match_donde.group(1).upper()
        origen = 'A'
        
        if validar_edificios(origen, destino):
            print(f"DETECTADO [donde está X]: origen={origen} (default), destino={destino}")
            return {
                'es_ruta': True,
                'origen': origen,
                'destino': destino,
                'mensaje_original': mensaje
            }
    
    print(f"No se detectó patrón de ruta en: {mensaje}")
    return None

# Las funciones validar_edificios() y obtener_ids_edificios() permanecen iguales
def validar_edificios(origen, destino):
    """
    Valida que ambos edificios existan en la BD
    """
    try:
        edificio_origen = Edificio.objects.filter(nombre__iexact=origen).exists()
        edificio_destino = Edificio.objects.filter(nombre__iexact=destino).exists()
        
        print(f"Validación: {origen}={edificio_origen}, {destino}={edificio_destino}")
        
        return edificio_origen and edificio_destino
    except Exception as e:
        print(f"Error validando edificios: {e}")
        return False

def obtener_ids_edificios(origen, destino):
    """
    Obtiene los IDs de los edificios por nombre
    
    Returns:
        tuple (id_origen, id_destino) o (None, None)
    """
    try:
        edificio_origen = Edificio.objects.get(nombre__iexact=origen)
        edificio_destino = Edificio.objects.get(nombre__iexact=destino)
        
        print(f"IDs encontrados: {origen}={edificio_origen.id_edificio}, {destino}={edificio_destino.id_edificio}")
        
        return edificio_origen.id_edificio, edificio_destino.id_edificio
    except Edificio.DoesNotExist as e:
        print(f"Edificio no encontrado: {e}")
        return None, None
    

# ==========================================
# MAPEO DE PROCESOS
# ==========================================
MAPEO_PROCESOS = { # Posibles palabras que el usuario utiliza
    # Servicio Social
    'servicio social': 'Servicio Social',
    'servicio': 'Servicio Social',
    'social': 'Servicio Social',
    
    # Créditos Complementarios
    'creditos': 'Créditos Complementarios',
    'credito': 'Créditos Complementarios',
    'complementarios': 'Créditos Complementarios',
    'créditos complementarios': 'Créditos Complementarios',
    'créditos': 'Créditos Complementarios',
    
    # Credencial Escolar
    'credencial': 'Credencial Escolar',
    'credencial escolar': 'Credencial Escolar',
    'tramitar credencial': 'Credencial Escolar',
    'sacar credencial': 'Credencial Escolar',
    'mi credencial': 'Credencial Escolar',
    'obtener credencial': 'Credencial Escolar',
    'hacer credencial': 'Credencial Escolar',
    
    # Sello Semestral de Credencial
    'resellar': 'Sello Semestral de Credencial',
    'sello': 'Sello Semestral de Credencial',
    'resello': 'Sello Semestral de Credencial',
    'sellar': 'Sello Semestral de Credencial',
    'sellar credencial': 'Sello Semestral de Credencial',
    'renovar credencial': 'Sello Semestral de Credencial',
    'sello semestral': 'Sello Semestral de Credencial',
    
    # Constancia de Estudios
    'constancia': 'Constancia de Estudios',
    'constancia de estudios': 'Constancia de Estudios',
    'constancia escolar': 'Constancia de Estudios',
    
    # Kardex
    'kardex': 'Kardex',
    'historial': 'Kardex',
    'historial academico': 'Kardex',
    'historial académico': 'Kardex',
    'calificaciones': 'Kardex',
    
    # Baja Temporal
    'baja': 'Baja Temporal',
    'baja temporal': 'Baja Temporal',
    'darme de baja': 'Baja Temporal',
    'suspender estudios': 'Baja Temporal',
    
    # Alta después de Baja Temporal
    'alta': 'Alta después de Baja Temporal',
    'regresar': 'Alta después de Baja Temporal',
    'reingreso': 'Alta después de Baja Temporal',
    'volver': 'Alta después de Baja Temporal',
    'reinscripcion': 'Alta después de Baja Temporal',
    'reinscripción': 'Alta después de Baja Temporal',
}

def normalizar_proceso(texto):
    texto_lower = texto.lower().strip()
    if texto_lower in MAPEO_PROCESOS:
        return MAPEO_PROCESOS[texto_lower]
    for keyword, proceso_oficial in MAPEO_PROCESOS.items():
        if keyword in texto_lower:
            return proceso_oficial
    for keyword, proceso_oficial in MAPEO_PROCESOS.items():
        if texto_lower in proceso_oficial.lower():
            return proceso_oficial
    return None


# ==========================================
# GESTIÓN DE ESTADO
# ==========================================
def obtener_estado_conversacion(session_id):
    if session_id not in conversaciones_activas:
        conversaciones_activas[session_id] = {
            "proceso_actual": None,
            "ultima_actualizacion": timezone.now()
        }
    return conversaciones_activas[session_id]

def actualizar_estado_conversacion(session_id, **kwargs):
    estado = obtener_estado_conversacion(session_id)
    estado.update(kwargs)
    estado["ultima_actualizacion"] = timezone.now()

def limpiar_estado_conversacion(session_id):
    if session_id in conversaciones_activas:
        del conversaciones_activas[session_id]

def obtener_contexto_reciente(session_id, max_msgs=4):
    contextos = Contexto.objects.filter(session_id=session_id).order_by("-fecha")[:max_msgs]
    contextos = list(contextos)[::-1]
    messages = []
    for ctx in contextos:
        role = "user" if ctx.role == "USER" else "assistant"
        messages.append({"role": role, "content": ctx.contenido})
    return messages


# ==========================================
# CLASIFICACIÓN
# ==========================================
def clasificar_intencion(mensaje):
    msg_lower = mensaje.lower().strip()
    despedidas = ['gracias', 'thanks', 'ok gracias', 'listo', 'ya está', 'perfecto']
    if any(d in msg_lower for d in despedidas) and len(msg_lower.split()) <= 4:
        return {'tipo': 'despedida'}
    
    proceso_detectado = normalizar_proceso(mensaje)
    match_paso = re.search(r'paso\s+(\d+\.?\d*)', msg_lower)
    if match_paso:
        return {
            'tipo': 'paso_especifico',
            'proceso': proceso_detectado,
            'numero_paso': match_paso.group(1)
        }
    
    if any(palabra in msg_lower for palabra in ['ya hice', 'ya termine', 'ya complete', 'acabo de']):
        actividad = msg_lower
        for palabra in ['ya hice', 'ya termine', 'ya complete', 'acabo de']:
            if palabra in actividad:
                actividad = actividad.split(palabra)[1].split(',')[0].split('¿')[0].strip()
                break
        return {
            'tipo': 'continuacion_natural',
            'proceso': proceso_detectado,
            'actividad_realizada': actividad
        }
    
    if any(palabra in msg_lower for palabra in ['siguiente', 'despues', 'después', 'qué sigue', 'continua', 'continúa']):
        return {'tipo': 'siguiente_paso', 'proceso': proceso_detectado}
    
    if any(palabra in msg_lower for palabra in ['cuanto tarda', 'cuánto tarda', 'duracion', 'duración', 'tiempo']):
        return {'tipo': 'tiempo', 'proceso': proceso_detectado}
    
    if any(palabra in msg_lower for palabra in ['quien', 'quién', 'responsable', 'encargado', 'donde lo hago', 'dónde']):
        return {'tipo': 'responsable', 'proceso': proceso_detectado}
    
    if any(palabra in msg_lower for palabra in ['requisito', 'necesito', 'requiere', 'documento', 'que ocupo', 'qué ocupo']):
        return {'tipo': 'requisitos', 'proceso': proceso_detectado}
    
    if any(palabra in msg_lower for palabra in ['como se hace', 'cómo se hace', 'como hago', 'cómo hago', 'procedimiento', 'pasos']):
        return {'tipo': 'proceso_completo', 'proceso': proceso_detectado}
    
    if proceso_detectado:
        return {'tipo': 'info_proceso', 'proceso': proceso_detectado}
    
    return {'tipo': 'general'}



# ==========================================
# PROMPTS OPTIMIZADOS
# ==========================================
def construir_prompt_con_chunks(pregunta, chunks_relevantes, tipo_consulta='general'): # Prompts más concisos y directos

    # Construir info de manera más limpia
    info_lines = []
    for chunk in chunks_relevantes:
        texto = chunk['texto']
        # Remover redundancias
        texto = texto.replace('Proceso:', '').replace('Paso:', '').strip()
        info_lines.append(texto)
    
    info_texto = "\n\n".join(info_lines)
    
    # Instrucciones según tipo de consulta
    if tipo_consulta == 'paso_especifico':
        instruccion = """Explica SOLO este paso específico:
        - Breve intro (1 línea)
        - Actividad detallada
        - Tiempo estimado
        - Responsable(s)
        - Requisitos (si los hay)
        - Emoji final"""
    
    elif tipo_consulta == 'proceso_completo':
        instruccion = """Resume el proceso completo:
        - Intro breve (2 líneas)
        - Lista los primeros 5 pasos (formato: "Paso X: actividad")
        - Resumen final
        - Emoji final
        NO des todos los detalles de cada paso."""
    
    else:
        instruccion = """Responde de forma clara y estructurada:
        - Intro breve (1-2 líneas)
        - Lista numerada con los puntos clave
        - Resumen final (1 línea)
        - Emoji final"""
    
    # Prompt final limpio
    prompt = f"""INFORMACIÓN:
    {info_texto}

    PREGUNTA: {pregunta}

    {instruccion}

    IMPORTANTE:
    - NUNCA menciones claves técnicas (SS-01, CC-03, etc.)
    - Usa "Paso 1", "Paso 2", "Paso 3", etc.
    - Sé conciso y directo

    RESPUESTA:"""
    
    return {"role": "user", "content": prompt}


# ==========================================
# PROCESAMIENTO PRINCIPAL
# ==========================================
def procesar_mensaje(mensaje, session_id=None, saltar_dialog=False):

    print(f"\n{'='*60}")
    print(f"PROCESANDO: {mensaje}")
    print(f"Session: {session_id}, Saltar Dialog: {saltar_dialog}")
    print(f"{'='*60}\n")

    if not session_id:
        session_id = uuid.uuid4()
    session_id_str = str(session_id)

    Contexto.objects.create(
        session_id=session_id,
        role="USER",
        contenido=mensaje,
        fecha=timezone.now()
    )

    estado = obtener_estado_conversacion(session_id_str)

    try:
        # ========== PRIORIDAD 0: DETECTAR CONSULTA SOBRE DEPARTAMENTOS ==========
        consulta_depto = detectar_consulta_departamento(mensaje)

        if consulta_depto:
            print(f"🏢 CONSULTA DE DEPARTAMENTO DETECTADA: {consulta_depto['departamento']}")
            
            # Obtener edificio A
            edificio_a = Edificio.objects.filter(nombre__iexact='A').first()
            
            if not edificio_a:
                respuesta_final = f"⚠️ **{consulta_depto['departamento']}** se encuentra en el **Edificio A**, pero no pude obtener más detalles."
            else:
                respuesta_construida = construir_respuesta_departamento(consulta_depto, edificio_a.id_edificio)
                
                # Si hay origen diferente de A, generar ruta
                if isinstance(respuesta_construida, dict) and respuesta_construida.get('tipo') == 'departamento_con_ruta':
                    # Obtener ID del edificio origen
                    edificio_origen = Edificio.objects.filter(nombre__iexact=consulta_depto['origen_edificio']).first()
                    
                    if edificio_origen:
                        respuesta_construida['origen_id'] = edificio_origen.id_edificio
                        
                        # Guardar en contexto
                        Contexto.objects.create(
                            session_id=session_id,
                            role="ASSISTANT",
                            contenido=json.dumps(respuesta_construida, ensure_ascii=False),
                            fecha=timezone.now()
                        )
                        
                        # Registrar consulta
                        Consulta.objects.create(
                            session_id=session_id,
                            modulo_consulta='UBICACIONES',
                            tipo_consulta=f'departamento-ruta-{consulta_depto["departamento"]}',
                            fecha=timezone.now()
                        )
                        
                        print(f"✅ RETORNANDO RESPUESTA DE DEPARTAMENTO CON RUTA")
                        return respuesta_construida, session_id
                
                # Si es solo información de ubicación
                respuesta_final = respuesta_construida if isinstance(respuesta_construida, str) else respuesta_construida['mensaje']
            
            # Guardar en contexto
            Contexto.objects.create(
                session_id=session_id,
                role="ASSISTANT",
                contenido=respuesta_final,
                fecha=timezone.now()
            )
            
            # Registrar consulta
            Consulta.objects.create(
                session_id=session_id,
                modulo_consulta='UBICACIONES',
                tipo_consulta=f'departamento-{consulta_depto["departamento"]}',
                fecha=timezone.now()
            )
            
            return respuesta_final, session_id
        # ========== PRIORIDAD 1: DETECTAR SOLICITUD DE RUTA (DEBE IR PRIMERO) ==========
        solicitud_ruta = detectar_solicitud_ruta(mensaje)
        
        if solicitud_ruta:
            print(f"🗺️ RUTA DETECTADA: {solicitud_ruta['origen']} → {solicitud_ruta['destino']}")
            
            # Obtener IDs de los edificios
            id_origen, id_destino = obtener_ids_edificios(
                solicitud_ruta['origen'], 
                solicitud_ruta['destino']
            )
            
            if id_origen and id_destino:
                # Generar respuesta especial con comando para el frontend
                respuesta_ruta = {
                    'tipo': 'abrir_mapa_con_ruta',
                    'origen_id': id_origen,
                    'destino_id': id_destino,
                    'origen_nombre': solicitud_ruta['origen'],
                    'destino_nombre': solicitud_ruta['destino'],
                    'mensaje': f"🗺️ ¡Perfecto! Te mostraré la ruta del edificio {solicitud_ruta['origen']} al {solicitud_ruta['destino']}"
                }
                
                # Guardar en contexto
                Contexto.objects.create(
                    session_id=session_id,
                    role="ASSISTANT",
                    contenido=json.dumps(respuesta_ruta, ensure_ascii=False),
                    fecha=timezone.now()
                )
                
                # Registrar consulta
                Consulta.objects.create(
                    session_id=session_id,
                    modulo_consulta='UBICACIONES',
                    tipo_consulta=f'ruta-{solicitud_ruta["origen"]}-{solicitud_ruta["destino"]}',
                    fecha=timezone.now()
                )
                
                print(f"✅ RETORNANDO RESPUESTA DE RUTA (NO CONTINUAR CON LLM)")
                return respuesta_ruta, session_id
            else:
                respuesta_final = f"Lo siento, no encontré los edificios {solicitud_ruta['origen']} y/o {solicitud_ruta['destino']}. ¿Puedes verificar los nombres?"
                
                Contexto.objects.create(
                    session_id=session_id,
                    role="ASSISTANT",
                    contenido=respuesta_final,
                    fecha=timezone.now()
                )
                
                print(f"❌ EDIFICIOS NO ENCONTRADOS PARA RUTA")
                return respuesta_final, session_id
        
        # ========== NUEVO: DETECTAR CONSULTA SOBRE EDIFICIOS ==========
        consulta_edificio = detectar_consulta_edificio(mensaje)
        
        if consulta_edificio:
            print(f"🏢 CONSULTA DE EDIFICIO DETECTADA: {consulta_edificio['tipo']}")
            
            if consulta_edificio['tipo'] == 'salon_especifico':
                # Buscar salón específico
                info_salon = consultar_salon_especifico(consulta_edificio['salon_numero'])
                respuesta_final = construir_respuesta_salon(info_salon)
            else:
                # Consultar info del edificio
                info_edificio = consultar_info_edificio(consulta_edificio['edificio_nombre'])
                respuesta_final = construir_respuesta_edificio(info_edificio, consulta_edificio['tipo'])
            
            # Guardar en contexto
            Contexto.objects.create(
                session_id=session_id,
                role="ASSISTANT",
                contenido=respuesta_final,
                fecha=timezone.now()
            )
            
            # Registrar consulta
            Consulta.objects.create(
                session_id=session_id,
                modulo_consulta='UBICACIONES',
                tipo_consulta=f'edificio-{consulta_edificio["tipo"]}',
                fecha=timezone.now()
            )
            
            return respuesta_final, session_id
    
        # ========== NUEVO: DETECTAR SOLICITUD DE RUTA ==========
        solicitud_ruta = detectar_solicitud_ruta(mensaje)
        
        if solicitud_ruta:
            print(f" - RUTA DETECTADA: {solicitud_ruta['origen']} → {solicitud_ruta['destino']}")
            
            # Obtener IDs de los edificios
            id_origen, id_destino = obtener_ids_edificios(
                solicitud_ruta['origen'], 
                solicitud_ruta['destino']
            )
            
            if id_origen and id_destino:
                # Generar respuesta especial con comando para el frontend
                respuesta_ruta = {
                    'tipo': 'abrir_mapa_con_ruta',
                    'origen_id': id_origen,
                    'destino_id': id_destino,
                    'origen_nombre': solicitud_ruta['origen'],
                    'destino_nombre': solicitud_ruta['destino'],
                    'mensaje': f"¡Perfecto! Te mostraré la ruta del edificio {solicitud_ruta['origen']} al {solicitud_ruta['destino']}"
                }
                
                # Guardar en contexto
                Contexto.objects.create(
                    session_id=session_id,
                    role="ASSISTANT",
                    contenido=json.dumps(respuesta_ruta, ensure_ascii=False),
                    fecha=timezone.now()
                )
                
                # Registrar consulta
                Consulta.objects.create(
                    session_id=session_id,
                    modulo_consulta='UBICACIONES',
                    tipo_consulta=f'ruta-{solicitud_ruta["origen"]}-{solicitud_ruta["destino"]}',
                    fecha=timezone.now()
                )
                
                return respuesta_ruta, session_id
            else:
                respuesta_final = f"Lo siento, no encontré los edificios {solicitud_ruta['origen']} y/o {solicitud_ruta['destino']}. ¿Puedes verificar los nombres?"
                
                Contexto.objects.create(
                    session_id=session_id,
                    role="ASSISTANT",
                    contenido=respuesta_final,
                    fecha=timezone.now()
                )
                
                return respuesta_final, session_id
        
        # ========== CONTINUAR CON LÓGICA NORMAL SI NO ES RUTA ==========

        # CLASIFICAR
        if saltar_dialog:
            proceso_nombre = normalizar_proceso(mensaje)
            intencion = {
                'tipo': 'info_proceso',
                'proceso': proceso_nombre
            }
            print(f" - BOTÓN: {mensaje} → {proceso_nombre}")
        else:
            intencion = clasificar_intencion(mensaje)
            print(f" - CLASIFICACIÓN: {intencion}")
        
        # DESPEDIDAS
        if intencion['tipo'] == 'despedida':
            respuesta_final = "¡De nada! Cualquier cosa me preguntas 😊"
            Contexto.objects.create(
                session_id=session_id,
                role="ASSISTANT",
                contenido=respuesta_final,
                fecha=timezone.now()
            )
            return respuesta_final, session_id
        
        # BUSCAR INFO (código existente sin cambios)
        proceso_actual = intencion.get('proceso') or estado.get('proceso_actual')
        chunks_relevantes = []
        tipo_consulta = intencion['tipo']
        
        if intencion['tipo'] == 'paso_especifico':
            chunk = buscador.buscar_paso_especifico(
                proceso_actual,
                intencion['numero_paso']
            )
            chunks_relevantes = [chunk] if chunk else []
            print(f"Paso específico: {len(chunks_relevantes)} encontrado")
        
        elif intencion['tipo'] == 'continuacion_natural':
            paso_realizado = buscador.buscar_paso_por_actividad(
                proceso_actual,
                intencion.get('actividad_realizada', '')
            )

            if paso_realizado:
                siguiente_paso = buscador.obtener_siguiente_paso(proceso_actual, paso_realizado)
                chunks_relevantes = [siguiente_paso] if siguiente_paso else []
                print(f" - Continuación natural: Paso {paso_realizado.get('numero_paso')} → Siguiente")
            else:
                chunks_relevantes = buscador.buscar(mensaje, top_k=2, proceso_especifico=proceso_actual)
                print(f" - Continuación natural (fallback): {len(chunks_relevantes)} chunks")
        
        elif intencion['tipo'] == 'info_proceso':
            chunks_generales = buscador.obtener_info_general(proceso_actual)
            for chunk in chunks_generales:
                if 'relevancia' not in chunk:
                    chunk['relevancia'] = 1.0
            
            chunks_pasos = buscador.buscar(
                mensaje,
                top_k=3,
                proceso_especifico=proceso_actual
            )

            chunks_relevantes = chunks_generales + chunks_pasos
            print(f" - Info proceso: {len(chunks_relevantes)} chunks")
            actualizar_estado_conversacion(session_id_str, proceso_actual=proceso_actual)

        elif intencion['tipo'] == 'proceso_completo':
            chunks_generales = buscador.obtener_info_general(proceso_actual)
            for chunk in chunks_generales:
                if 'relevancia' not in chunk:
                    chunk['relevancia'] = 1.0

            todos_pasos = buscador.obtener_todos_pasos(proceso_actual, max_pasos=5)
            for chunk in todos_pasos:
                if 'relevancia' not in chunk:
                    chunk['relevancia'] = 0.95
            
            chunks_relevantes = chunks_generales + todos_pasos
            print(f" - Proceso completo: {len(chunks_relevantes)} chunks")
            actualizar_estado_conversacion(session_id_str, proceso_actual=proceso_actual)

        elif intencion['tipo'] == 'requisitos':
            chunks_requisitos = buscador.buscar_requisitos(proceso_actual, tipo='generales')
            for chunk in chunks_requisitos:
                if 'relevancia' not in chunk:
                    chunk['relevancia'] = 1.0
            
            chunks_pasos_req = buscador.buscar(
                mensaje,
                top_k=2,
                proceso_especifico=proceso_actual,
                filtro_tipo='paso'
            )
            chunks_relevantes = chunks_requisitos + chunks_pasos_req
            print(f" - Requisitos: {len(chunks_relevantes)} chunks")

        elif intencion['tipo'] == 'tiempo':
            chunks_relevantes = buscador.buscar(
                mensaje,
                top_k=3,
                proceso_especifico=proceso_actual,
                filtro_tipo='paso'
            )
            print(f" - Tiempo: {len(chunks_relevantes)} chunks")
        
        elif intencion['tipo'] == 'responsable':
            chunks_relevantes = buscador.buscar(
                mensaje,
                top_k=3,
                proceso_especifico=proceso_actual,
                filtro_tipo='paso'
            )
            print(f" - Responsable: {len(chunks_relevantes)} chunks")
        
        elif intencion['tipo'] == 'siguiente_paso':
            contexto_previo = obtener_contexto_reciente(session_id_str, max_msgs=4)
            ultimo_paso = None

            for msg in reversed(contexto_previo):
                if msg['role'] in ['user', 'assistant']:
                    match = re.search(r'paso\s+(\d+)', msg['content'].lower())
                    if match:
                        ultimo_paso = match.group(1)
                        print(f" - Último paso detectado: {ultimo_paso}")
                        break

            if ultimo_paso and proceso_actual:
                paso_actual_chunk = buscador.buscar_paso_especifico(proceso_actual, ultimo_paso)
                
                if paso_actual_chunk:
                    siguiente = buscador.obtener_siguiente_paso(proceso_actual, paso_actual_chunk)
                    
                    if siguiente:
                        chunks_relevantes = [siguiente]
                        print(f"Siguiente paso encontrado")
                    else:
                        print(f"Último paso alcanzado")
                        chunks_relevantes = [paso_actual_chunk]
                        paso_actual_chunk['es_ultimo'] = True
                else:
                    print(f" - Paso {ultimo_paso} no encontrado")
                    chunks_relevantes = buscador.buscar(mensaje, top_k=2, proceso_especifico=proceso_actual)
            else:
                chunks_relevantes = buscador.buscar(mensaje, top_k=2, proceso_especifico=proceso_actual)
                print(f" - Siguiente paso (búsqueda general)")
        
        else:
            chunks_relevantes = buscador.buscar(
                mensaje,
                top_k=3,
                proceso_especifico=proceso_actual
            )
            print(f" - Búsqueda general: {len(chunks_relevantes)} chunks")

        # CONSTRUIR EL PROMPT OPTIMIZADO
        if not chunks_relevantes:
            prompt_usuario = {
                "role": "user",
                "content": f'Pregunta: "{mensaje}"\n\nNo encontré información sobre esto. Discúlpate brevemente y sugiere reformular o preguntar sobre otro trámite. Mantén el formato (intro + sugerencias + emoji).'
            }
        else:
            prompt_usuario = construir_prompt_con_chunks(mensaje, chunks_relevantes, tipo_consulta)

        # SIN SYSTEM PROMPT ADICIONAL - Uso del Modelfile
        mensajes_previos = obtener_contexto_reciente(session_id_str, max_msgs=2)
        mensajes_completos = mensajes_previos + [prompt_usuario]

        print("\n===== LLAMANDO A LLAMA-RAPIDO =====")
        for i, m in enumerate(mensajes_completos, 1):
            contenido = m.get('content') or ''
            preview = contenido[:100] + "..." if len(contenido) > 100 else contenido
            print(f"[{i}] {m['role']}: {preview}")
        print("===== FIN =====\n")

        respuesta_final = ollama_respuesta(mensajes_completos)
        print(f" - Respuesta: {respuesta_final[:100]}...\n")

        Consulta.objects.create(
            session_id=session_id,
            modulo_consulta='PROCESOS',
            tipo_consulta=f'{intencion["tipo"]}-{proceso_actual or "general"}',
            fecha=timezone.now()
        )
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        respuesta_final = "Lo siento, hubo un error. Intenta de nuevo."
    
    Contexto.objects.create(
        session_id=session_id,
        role="ASSISTANT",
        contenido=respuesta_final,
        fecha=timezone.now()
    )
    
    print(f"{'='*60}\n PROCESO COMPLETADO\n{'='*60}\n")
    return respuesta_final, session_id