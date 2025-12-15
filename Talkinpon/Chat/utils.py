# Talkinpon/Chat/utils.py

'''
Orquestador principal del sistema de chat
Coordina detectores y handlers para procesar mensajes del usuario
'''

import uuid
import json
from django.utils import timezone

# Modulos del sistema
from .busqueda_semantica import obtener_buscador
from .helpers import (
    obtener_estado_conversacion,
    actualizar_estado_conversacion,
    guardar_contexto,
    registrar_consulta
)

# Detectores
from .detectors.building_detector import BuildingDetector
from .detectors.department_detector import DepartmentDetector
from .detectors.facilities_detector import GeneralFacilitiesDetector
from .detectors.location_detector import UniversalLocationDetector  # NUEVO
from .detectors.process_detector import ProcessDetector
from .detectors.route_detector import RouteDetector

# Handlers
from .handlers.building_handler import BuildingHandler
from .handlers.department_handler import DepartmentHandler
from .handlers.facilities_handler import GeneralFacilitiesHandler
from .handlers.location_handler import UniversalLocationHandler  # NUEVO
from .handlers.process_handler import ProcessHandler
from .handlers.route_handler import RouteHandler

# ==========================================
# INICIALIZACIÓN DE COMPONENTES
# ==========================================
buscador = obtener_buscador()

# Detectores
detector_edificio = BuildingDetector()
detector_departamento = DepartmentDetector()
detector_instalaciones_generales = GeneralFacilitiesDetector()
detector_ubicacion_universal = UniversalLocationDetector()  # NUEVO
detector_proceso = ProcessDetector()
detector_ruta = RouteDetector()

# Handlers
handler_edificio = BuildingHandler()
handler_departamento = DepartmentHandler()
handler_instalaciones_generales = GeneralFacilitiesHandler()
handler_ubicacion_universal = UniversalLocationHandler()  # NUEVO
handler_proceso = ProcessHandler(buscador)
handler_ruta = RouteHandler()

# ==========================================
# FUNCIÓN PRINCIPAL
# ==========================================
def procesar_mensaje(mensaje, session_id=None, saltar_dialog=False):
    '''
    Procesa un mensaje del usuario y genera una respuesta
    
    Args:
        mensaje: Texto del mensaje del usuario
        session_id: ID de sesión (se genera si no existe)
        saltar_dialog: Si viene de un botón (True) o texto libre (False)
    
    Returns:
        tuple (respuesta, session_id)
        - respuesta puede ser: string o dict con comandos especiales
    '''
    
    print(f"\n{'='*60}")
    print(f"PROCESANDO: {mensaje}")
    print(f"Session: {session_id}, Botón: {saltar_dialog}")
    print(f"{'='*60}\n")
    
    # Generar o normalizar session_id
    if not session_id:
        session_id = uuid.uuid4()
    session_id_str = str(session_id)
    
    # Guardar mensaje del usuario
    guardar_contexto(session_id, "USER", mensaje)
    
    # Obtener estado de conversación
    estado = obtener_estado_conversacion(session_id_str)
    
    try:
        # ==========================================
        # FASE 1: DETECCIÓN DE CONSULTAS PRIORITARIAS
        # ==========================================
        
        # PRIORIDAD 1: Consultas generales de instalaciones (¿dónde hay baños?)
        # DEBE IR PRIMERO para no confundirse con consultas de edificio específico
        consulta_general = detector_instalaciones_generales.detectar(mensaje)
        if consulta_general:
            print(f"🌐 CONSULTA GENERAL: {consulta_general['tipo_instalacion']}")
            return _procesar_consulta_general(consulta_general, session_id)
        
        # PRIORIDAD 2: Ubicación específica universal (Centro de Lenguas, Sala Memorial, etc.)
        # Debe ir ANTES de departamentos para capturar lugares específicos
        consulta_ubicacion = detector_ubicacion_universal.detectar(mensaje)
        if consulta_ubicacion:
            print(f"📍 UBICACIÓN ESPECÍFICA: {consulta_ubicacion['nombre_buscado']}")
            return _procesar_ubicacion_especifica(consulta_ubicacion, session_id)
        
        # PRIORIDAD 3: Departamentos del Edificio A (departamentos administrativos específicos)
        consulta_depto = detector_departamento.detectar(mensaje)
        if consulta_depto:
            print(f"🏢 DEPARTAMENTO: {consulta_depto['departamento']}")
            return _procesar_departamento(consulta_depto, session_id)
        
        # PRIORIDAD 4: Rutas entre edificios (debe ir antes que edificios)
        solicitud_ruta = detector_ruta.detectar(mensaje)
        if solicitud_ruta:
            print(f"🗺️ RUTA: {solicitud_ruta['origen']} → {solicitud_ruta['destino']}")
            return _procesar_ruta(solicitud_ruta, session_id)
        
        # PRIORIDAD 5: Consultas sobre edificios
        # IMPORTANTE: Diferenciar entre ubicación (mapa) e info (texto)
        consulta_edificio = detector_edificio.detectar(mensaje)
        if consulta_edificio:
            tipo = consulta_edificio['tipo']
            
            # CASO ESPECIAL: Laboratorio específico (siempre procesa directo)
            if tipo == 'laboratorio_especifico':
                print(f"🔬 LABORATORIO ESPECÍFICO: {consulta_edificio['laboratorio_nombre']}")
                return _procesar_edificio(consulta_edificio, session_id)
            
            # Para edificios normales: diferenciar entre ubicación (mapa) e info (texto)
            if _es_consulta_ubicacion(mensaje):
                print(f"🗺️ UBICACIÓN DE EDIFICIO: {consulta_edificio['edificio_nombre']}")
                return _procesar_edificio_con_mapa(consulta_edificio, session_id)
            else:
                print(f"📋 INFO EDIFICIO: {tipo}")
                return _procesar_edificio(consulta_edificio, session_id)
        
        # ==========================================
        # FASE 2: PROCESOS ADMINISTRATIVOS
        # ==========================================
        
        # Clasificar intención
        if saltar_dialog:
            # Mensaje viene de un botón
            from .constants import MAPEO_PROCESOS
            from .helpers import normalizar_proceso
            
            proceso_nombre = normalizar_proceso(mensaje, MAPEO_PROCESOS)
            intencion = {
                'tipo': 'info_proceso',
                'proceso': proceso_nombre
            }
            print(f"🔘 BOTÓN: {mensaje} → {proceso_nombre}")
        else:
            # Mensaje de texto libre
            intencion = detector_proceso.clasificar_intencion(mensaje)
            print(f"🎯 INTENCIÓN: {intencion}")
        
        # Manejar saludo
        if intencion['tipo'] == 'saludo':
            return _procesar_saludo(session_id)
        
        # Manejar despedidas
        if intencion['tipo'] == 'despedida':
            return _procesar_despedida(session_id)
        
        # Procesar consulta sobre procesos
        return _procesar_proceso(mensaje, intencion, estado, session_id_str)
    
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        
        respuesta = "Lo siento, hubo un error. Intenta de nuevo."
        guardar_contexto(session_id, "ASSISTANT", respuesta)
        return respuesta, session_id

# ==========================================
# FUNCIONES AUXILIARES DE DETECCIÓN
# ==========================================

def _es_consulta_ubicacion(mensaje):
    """
    Detecta si el mensaje pregunta por la ubicación/dirección de un edificio
    Keywords que indican que el usuario quiere VER el edificio en el mapa
    """
    msg_lower = mensaje.lower()
    
    keywords_ubicacion = [
        'donde esta', 'dónde está', 'donde está',
        'donde queda', 'dónde queda',
        'como llego', 'cómo llego',
        'como voy', 'cómo voy',
        'ubicacion', 'ubicación',
        'en donde', 'en dónde',
        'encontrar', 'busco',
        'ir a', 'voy a',
        'llevame', 'llévame'
    ]
    
    return any(kw in msg_lower for kw in keywords_ubicacion)

# ==========================================
# FUNCIONES DE PROCESAMIENTO ESPECÍFICAS
# ==========================================

def _procesar_ubicacion_especifica(consulta_ubicacion, session_id):
    """
    Procesa consulta de ubicación específica universal
    Ejemplos: "Centro de Lenguas", "Sala Memorial", "Laboratorio de Física"
    """
    
    nombre_buscado = consulta_ubicacion['nombre_buscado']
    
    print(f"🔍 Buscando ubicación específica: {nombre_buscado}")
    
    # Buscar en BD
    info_busqueda = handler_ubicacion_universal.buscar_ubicacion(nombre_buscado)
    
    # Construir respuesta
    respuesta = handler_ubicacion_universal.construir_respuesta(
        info_busqueda,
        nombre_buscado
    )
    
    # Guardar en contexto
    guardar_contexto(session_id, "ASSISTANT", respuesta)
    
    # Registrar consulta
    if info_busqueda and info_busqueda.get('encontrado'):
        primer_resultado = info_busqueda['resultados'][0]
        tipo_registro = f'ubicacion-{primer_resultado["tipo"]}-{primer_resultado["nombre"][:30]}'
    else:
        tipo_registro = f'ubicacion-no-encontrado-{nombre_buscado[:30]}'
    
    registrar_consulta(session_id, 'UBICACIONES', tipo_registro)
    
    print(f"✅ Respuesta ubicación específica generada")
    return respuesta, session_id


def _procesar_consulta_general(consulta_general, session_id):
    """
    Procesa consulta general sobre instalaciones
    Ejemplo: "¿Dónde hay baños?" (sin mencionar edificio específico)
    """
    
    tipo_instalacion = consulta_general['tipo_instalacion']
    
    print(f"🔍 Buscando {tipo_instalacion}s en todo el campus")
    
    # Buscar instalaciones en todo el campus
    resultado = handler_instalaciones_generales.buscar_instalaciones_por_tipo(
        tipo_instalacion
    )
    
    if not resultado:
        respuesta = f"❌ No encontré {tipo_instalacion}s en el campus.\n\n¿Podrías verificar el nombre?"
        guardar_contexto(session_id, "ASSISTANT", respuesta)
        registrar_consulta(session_id, 'UBICACIONES', f'general-{tipo_instalacion}-no-encontrado')
        return respuesta, session_id
    
    # Decidir formato de respuesta según cantidad de edificios
    total_edificios = resultado['total_edificios']
    
    if total_edificios <= 5:
        # Respuesta detallada (pocos edificios)
        respuesta = handler_instalaciones_generales.construir_respuesta(resultado)
    else:
        # Respuesta compacta (muchos edificios)
        respuesta = handler_instalaciones_generales.construir_respuesta_compacta(resultado)
    
    # Guardar respuesta
    guardar_contexto(session_id, "ASSISTANT", respuesta)
    
    # Registrar consulta
    registrar_consulta(
        session_id,
        'UBICACIONES',
        f'general-{tipo_instalacion}'
    )
    
    print(f"✅ Respuesta consulta general generada: {total_edificios} edificio(s)")
    return respuesta, session_id


def _procesar_departamento(consulta_depto, session_id):
    """Procesa consulta sobre departamento del Edificio A"""
    
    respuesta = handler_departamento.construir_respuesta(consulta_depto)
    
    # Si es dict, es comando de ruta
    if isinstance(respuesta, dict):
        contenido_guardar = json.dumps(respuesta, ensure_ascii=False)
    else:
        contenido_guardar = respuesta
    
    guardar_contexto(session_id, "ASSISTANT", contenido_guardar)
    registrar_consulta(
        session_id,
        'UBICACIONES',
        f'departamento-{consulta_depto["departamento"]}'
    )
    
    print(f"✅ Respuesta departamento generada")
    return respuesta, session_id


def _procesar_ruta(solicitud_ruta, session_id):
    """Procesa solicitud de ruta entre edificios"""
    
    respuesta = handler_ruta.construir_respuesta(solicitud_ruta)
    
    # Respuesta es dict con comando o string de error
    if isinstance(respuesta, dict):
        contenido_guardar = json.dumps(respuesta, ensure_ascii=False)
        tipo_registro = f'ruta-{solicitud_ruta["origen"]}-{solicitud_ruta["destino"]}'
    else:
        contenido_guardar = respuesta
        tipo_registro = 'ruta-error'
    
    guardar_contexto(session_id, "ASSISTANT", contenido_guardar)
    registrar_consulta(session_id, 'UBICACIONES', tipo_registro)
    
    print(f"✅ Respuesta ruta generada")
    return respuesta, session_id


def _procesar_edificio_con_mapa(consulta_edificio, session_id):
    """
    Procesa consulta de ubicación de edificio → SIEMPRE abre mapa
    
    Args:
        consulta_edificio: dict con 'edificio_nombre'
        session_id: ID de sesión
    
    Returns:
        tuple (comando_mapa, session_id)
    """
    
    edificio_nombre = consulta_edificio['edificio_nombre']
    
    print(f"🗺️ Generando comando de mapa para edificio: {edificio_nombre}")
    
    # Obtener edificio de la BD
    from .helpers import obtener_edificio_por_nombre
    edificio = obtener_edificio_por_nombre(edificio_nombre)
    
    if not edificio:
        respuesta = f"Lo siento, no encontré el edificio {edificio_nombre}. ¿Podrías verificar el nombre?"
        guardar_contexto(session_id, "ASSISTANT", respuesta)
        return respuesta, session_id
    
    # Generar comando para abrir mapa centrado en el edificio
    respuesta = {
        'tipo': 'abrir_mapa_edificio',
        'edificio_id': edificio.id_edificio,
        'edificio_nombre': edificio_nombre,
        'mensaje': f"🗺️ Te muestro la ubicación del edificio {edificio_nombre}"
    }
    
    # Guardar como JSON en contexto
    contenido_guardar = json.dumps(respuesta, ensure_ascii=False)
    guardar_contexto(session_id, "ASSISTANT", contenido_guardar)
    
    # Registrar consulta
    registrar_consulta(
        session_id, 
        'UBICACIONES', 
        f'mapa-edificio-{edificio_nombre}'
    )
    
    print(f"✅ Comando de mapa generado: edificio {edificio_nombre} (ID: {edificio.id_edificio})")
    return respuesta, session_id


def _procesar_edificio(consulta_edificio, session_id):
    """
    Procesa consulta de INFO sobre edificio (sin abrir mapa)
    
    Esto se usa cuando preguntan sobre contenido del edificio:
    - "¿Qué salones tiene el edificio X?"
    - "¿Para qué sirve el edificio X?"
    - "¿Tiene baños el edificio X?"
    """
    
    tipo = consulta_edificio['tipo']
    
    print(f"📋 Consultando info de edificio, tipo: {tipo}")
    
    # CASO ESPECIAL: Laboratorio específico (ej: "donde está el LC3")
    if tipo == 'laboratorio_especifico':
        lab_nombre = consulta_edificio['laboratorio_nombre']
        lab_info = handler_edificio.buscar_laboratorio_especifico(lab_nombre)
        
        if lab_info:
            respuesta = handler_edificio.construir_respuesta(lab_info, 'laboratorio_especifico')
        else:
            respuesta = f"❌ No encontré el laboratorio **{lab_nombre}**.\n\n¿Podrías verificar el nombre?"
        
        guardar_contexto(session_id, "ASSISTANT", respuesta)
        registrar_consulta(session_id, 'UBICACIONES', f'laboratorio-especifico-{lab_nombre}')
        
        print(f"✅ Respuesta laboratorio específico generada")
        return respuesta, session_id
    
    # Consultar información según el tipo
    if tipo == 'salon_especifico':
        info = handler_edificio.consultar_salon(consulta_edificio['salon_numero'])
    else:
        info = handler_edificio.consultar_edificio(consulta_edificio['edificio_nombre'])
    
    # Construir respuesta textual
    respuesta = handler_edificio.construir_respuesta(info, tipo)
    
    # Guardar en contexto
    guardar_contexto(session_id, "ASSISTANT", respuesta)
    
    # Registrar consulta
    registrar_consulta(
        session_id, 
        'UBICACIONES', 
        f'edificio-{tipo}'
    )
    
    print(f"✅ Respuesta de info de edificio generada")
    return respuesta, session_id


def _procesar_saludo(session_id):
    """Procesa mensaje de saludo"""
    
    respuesta = "¡Hola, qué bueno verte por aquí! 😊 ¿En qué te ayudo hoy?"
    guardar_contexto(session_id, "ASSISTANT", respuesta)
    
    print(f"👋 Saludo")
    return respuesta, session_id


def _procesar_despedida(session_id):
    """Procesa mensaje de despedida"""
    
    respuesta = "¡De nada! Cualquier cosa me preguntas 😊"
    guardar_contexto(session_id, "ASSISTANT", respuesta)
    
    print(f"👋 Despedida")
    return respuesta, session_id


def _procesar_proceso(mensaje, intencion, estado, session_id_str):
    """Procesa consulta sobre proceso administrativo"""
    
    # Buscar información relevante
    chunks_relevantes, tipo_consulta = handler_proceso.buscar_informacion(
        mensaje,
        intencion,
        estado,
        session_id_str
    )
    
    print(f"📚 Chunks encontrados: {len(chunks_relevantes)}")
    
    # Actualizar estado si hay proceso
    proceso_actual = intencion.get('proceso') or estado.get('proceso_actual')
    if proceso_actual and intencion['tipo'] in ['info_proceso', 'proceso_completo']:
        actualizar_estado_conversacion(session_id_str, proceso_actual=proceso_actual)
    
    # Construir prompt para el LLM
    prompt = handler_proceso.construir_prompt(mensaje, chunks_relevantes, tipo_consulta)
    
    # Generar respuesta
    respuesta_final = handler_proceso.generar_respuesta(prompt, session_id_str)
    
    # Guardar respuesta
    guardar_contexto(session_id_str, "ASSISTANT", respuesta_final)
    
    # Registrar consulta
    registrar_consulta(
        session_id_str,
        'PROCESOS',
        f'{intencion["tipo"]}-{proceso_actual or "general"}'
    )
    
    print(f"✅ Respuesta proceso generada\n{'='*60}\n")
    return respuesta_final, session_id_str