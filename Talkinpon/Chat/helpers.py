# Talkinpon/Chat/helpers.py

"""
Funciones auxiliares y utilidades compartidas
"""

import re
from django.utils import timezone
from .models import Contexto, Consulta
from Ubicaciones.models import Edificio

# ==========================================
# GESTIÓN DE ESTADO DE CONVERSACIÓN
# ==========================================
conversaciones_activas = {}

def obtener_estado_conversacion(session_id):
    """Obtiene o crea el estado de una conversación"""
    if session_id not in conversaciones_activas:
        conversaciones_activas[session_id] = {
            "proceso_actual": None,
            "ultima_actualizacion": timezone.now()
        }
    return conversaciones_activas[session_id]

def actualizar_estado_conversacion(session_id, **kwargs):
    """Actualiza el estado de una conversación"""
    estado = obtener_estado_conversacion(session_id)
    estado.update(kwargs)
    estado["ultima_actualizacion"] = timezone.now()

def limpiar_estado_conversacion(session_id):
    """Limpia el estado de una conversación"""
    if session_id in conversaciones_activas:
        del conversaciones_activas[session_id]

# ==========================================
# GESTIÓN DE CONTEXTO
# ==========================================
def obtener_contexto_reciente(session_id, max_msgs=4):
    """Obtiene los últimos mensajes de contexto"""
    contextos = Contexto.objects.filter(
        session_id=session_id
    ).order_by("-fecha")[:max_msgs]
    
    contextos = list(contextos)[::-1]
    messages = []
    
    for ctx in contextos:
        role = "user" if ctx.role == "USER" else "assistant"
        messages.append({"role": role, "content": ctx.contenido})
    
    return messages

def guardar_contexto(session_id, role, contenido):
    """Guarda un mensaje en el contexto"""
    Contexto.objects.create(
        session_id=session_id,
        role=role,
        contenido=contenido,
        fecha=timezone.now()
    )

def registrar_consulta(session_id, modulo, tipo_consulta):
    """Registra una consulta en la BD"""
    Consulta.objects.create(
        session_id=session_id,
        modulo_consulta=modulo,
        tipo_consulta=tipo_consulta,
        fecha=timezone.now()
    )

# ==========================================
# VALIDACIÓN Y BÚSQUEDA DE EDIFICIOS
# ==========================================
def validar_edificios(origen, destino):
    """Valida que ambos edificios existan en la BD"""
    try:
        edificio_origen = Edificio.objects.filter(nombre__iexact=origen).exists()
        edificio_destino = Edificio.objects.filter(nombre__iexact=destino).exists()
        
        print(f"Validación: {origen}={edificio_origen}, {destino}={edificio_destino}")
        return edificio_origen and edificio_destino
    
    except Exception as e:
        print(f"Error validando edificios: {e}")
        return False

def obtener_ids_edificios(origen, destino):
    """Obtiene los IDs de dos edificios por nombre"""
    try:
        edificio_origen = Edificio.objects.get(nombre__iexact=origen)
        edificio_destino = Edificio.objects.get(nombre__iexact=destino)
        
        print(f"IDs: {origen}={edificio_origen.id_edificio}, {destino}={edificio_destino.id_edificio}")
        return edificio_origen.id_edificio, edificio_destino.id_edificio
    
    except Edificio.DoesNotExist as e:
        print(f"Edificio no encontrado: {e}")
        return None, None

def obtener_edificio_por_nombre(nombre):
    """Obtiene un edificio por nombre"""
    try:
        return Edificio.objects.filter(nombre__iexact=nombre).first()
    except Exception as e:
        print(f"Error obteniendo edificio: {e}")
        return None

# ==========================================
# EXTRACCIÓN DE PATRONES
# ==========================================
def extraer_edificio_de_texto(texto):
    """
    Extrae el nombre de un edificio del texto usando múltiples patrones
    
    Returns:
        String con letra del edificio en mayúscula o None
    """
    msg_lower = texto.lower()
    
    # Patrón 1: "edificio X"
    match = re.search(r'edificio\s+([a-z])\b', msg_lower)
    if match:
        return match.group(1).upper()
    
    # Patrón 2: "el X"
    match = re.search(r'\bel\s+([a-z])\b', msg_lower)
    if match:
        return match.group(1).upper()
    
    # Patrón 3: "en/del/al X"
    match = re.search(r'\b(?:en|del|al)\s+([a-z])\b', msg_lower)
    if match:
        return match.group(1).upper()
    
    # Patrón 4: letra al final
    match = re.search(r'\b([a-z])\s*\??$', msg_lower)
    if match:
        letra = match.group(1)
        # Evitar palabras comunes
        if letra not in ['a', 'o', 'y', 'e', 'u']:
            return letra.upper()
    
    return None

def extraer_numero_salon(texto):
    """Extrae el número de un salón del texto"""
    match = re.search(r'sal[oó]n\s+([a-z0-9]+)', texto.lower())
    if match:
        return match.group(1).upper()
    return None

def extraer_numero_paso(texto):
    """Extrae el número de paso del texto"""
    match = re.search(r'paso\s+(\d+\.?\d*)', texto.lower())
    if match:
        return match.group(1)
    return None

# ==========================================
# NORMALIZACIÓN
# ==========================================
def normalizar_proceso(texto, mapeo_procesos):
    """
    Normaliza el nombre de un proceso a su forma oficial
    
    Args:
        texto: Texto del usuario
        mapeo_procesos: Diccionario de mapeo
    
    Returns:
        Nombre oficial del proceso o None
    """
    texto_lower = texto.lower().strip()
    
    # Coincidencia exacta
    if texto_lower in mapeo_procesos:
        return mapeo_procesos[texto_lower]
    
    # Búsqueda por keyword
    for keyword, proceso_oficial in mapeo_procesos.items():
        if keyword in texto_lower:
            return proceso_oficial
    
    # Búsqueda inversa (texto dentro del proceso oficial)
    for keyword, proceso_oficial in mapeo_procesos.items():
        if texto_lower in proceso_oficial.lower():
            return proceso_oficial
    
    return None