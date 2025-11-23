# Talkinpon/Chat/utils.py

'''
Utils.py es el archivo que define como es que se crea la respuesta para el usuario
Aqui se explica cada paso por el que se procesa la consulta del usuario
y como es que se genera la respuesta en base al Modelo IA y DialogFlow
'''

from .ollama_servidor import respuesta as ollama_respuesta
from .models import Contexto, Consulta
from .database_queries import (
    buscar_proceso_completo,
    buscar_edificio, 
    buscar_salon,
    listar_todos_procesos,
    listar_todos_edificios,
)
from DialogFlow.dialogflow_service import detect_intent_texts
from django.utils import timezone
import uuid
import json

conversaciones_activas = {}

def obtener_estado_conversacion(session_id):
    if session_id not in conversaciones_activas:
        conversaciones_activas[session_id] = {
            "proceso_actual": None,
            "info_proceso": None,
            "tipo_consulta": None,
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

def obtener_contexto_reciente(session_id, max_msgs=3):
    contextos = Contexto.objects.filter(session_id=session_id).order_by("-fecha")[:max_msgs]
    contextos = list(contextos)[::-1]
    
    messages = []
    for ctx in contextos:
        role = "user" if ctx.role == "USER" else "assistant"
        messages.append({"role": role, "content": ctx.contenido})
    
    return messages

def es_despedida(mensaje):
    """Detecta si el usuario está terminando la conversación"""
    despedidas = [
        'gracias', 'thanks', 'ok gracias', 'muchas gracias',
        'perfecto gracias', 'ya está', 'listo', 'ok listo',
        'eso es todo', 'nada más', 'ya'
    ]
    msg_lower = mensaje.lower().strip()
    
    # Si el mensaje es corto y contiene despedida
    if len(msg_lower.split()) <= 4:
        if any(desp in msg_lower for desp in despedidas):
            return True
    
    return False

def construir_prompt_sistema():
    return {
        "role": "system",
        "content": """Eres un estudiante de último semestre del Tec de Morelia que ya hizo todos los trámites.

        Ayudas a compañeros de forma NATURAL, como platicar en la cafetería.

        REGLAS ESTRICTAS:
        1. NUNCA repitas o menciones la pregunta del usuario
        2. Ve DIRECTO a responder
        3. Habla casual: "mira", "we", "eso sí", "básicamente"
        4. NO uses lenguaje formal o corporativo
        5. NO menciones "base de datos", "información", etc.

        EJEMPLOS:

        MAL: "La pregunta del usuario es... El paso 1 es..."
        BIEN: "El primer paso es recibir solicitudes. Tarda 2 semanas..."

        MAL: "Según la información disponible, después del paso..."
        BIEN: "Después de eso viene el paso 3, donde..."

        Responde como compa que genuinamente ayuda."""
    }

def construir_prompt_con_info_proceso(user_query, info_proceso):
    info_json = json.dumps(info_proceso, indent=2, ensure_ascii=False)
    
    return {
        "role": "user",
        "content": f"""PROCESO:

        {info_json}

        PREGUNTA: "{user_query}"

        REGLAS:
        - NO repitas la pregunta
        - Responde DIRECTO y CONCISO
        - Si menciona número de paso, busca ESE paso y explícalo (actividad, tiempo, responsable)
        - Si pregunta "qué sigue", identifica paso anterior en la conversación y explica el siguiente
        - Si pregunta algo general, da resumen breve
        - Si pregunta sobre requisitos de estudiante, busca en requisitos_generales
        - Tono casual pero preciso

        RESPONDE:"""
    }

def construir_prompt_inicial(user_query, datos_bd, tipo_consulta):
    if not datos_bd:
        return {
            "role": "user",
            "content": f'PREGUNTA: "{user_query}"\n\nNo hay info. Discúlpate casual y sugiere reformular.'
        }
    
    datos_json = json.dumps(datos_bd, indent=2, ensure_ascii=False)
    
    if tipo_consulta == "Procesos":
        if 'pasos' in datos_bd:
            prompt = f"""PROCESO:

            {datos_json}

            PREGUNTA: "{user_query}"

            REGLAS:
            - NO repitas la pregunta
            - Responde DIRECTO
            - Si pregunta paso específico, búscalo y explícalo
            - Tono casual de compañero

            RESPONDE:"""
        else:
            prompt = f"""PREGUNTA: "{user_query}"

            PROCESOS:
            {datos_json}

            Lista los procesos amigable. Tono casual.

            RESPONDE:"""
    
    elif tipo_consulta == "Ubicaciones":
        if 'salones' in datos_bd:
            prompt = f"""PREGUNTA: "{user_query}"

            EDIFICIO:
            {datos_json}

            Explica dónde está y para qué sirve. Casual. NO repitas pregunta.

            RESPONDE:"""
        elif 'edificio' in datos_bd:
            prompt = f"""PREGUNTA: "{user_query}"

            SALÓN:
            {datos_json}

            Explica dónde está. Casual. NO repitas pregunta.

            RESPONDE:"""
        else:
            prompt = f"""PREGUNTA: "{user_query}"

            EDIFICIOS:
            {datos_json}

            Lista edificios. Casual.

            RESPONDE:"""
    else:
        prompt = f"""PREGUNTA: "{user_query}"

        INFO:
        {datos_json}

        Responde claro y casual.

        RESPONDE:"""
    
    return {"role": "user", "content": prompt}

def clasificar_mensaje_localmente(mensaje):
    query = mensaje.lower()
    
    proceso_keywords = [
        'tramita', 'requisitos', 'procedimiento', 'solicitar', 
        'kardex', 'titulo', 'servicio social', 'pasos', 'tramitar',
        'paso', 'tramite', 'proceso', 'como hago', 'titulacion',
        'constancia', 'credito'
    ]
    
    ubicacion_keywords = [
        'donde', 'ubicación', 'esta', 'está', 'salon', 'salón',
        'laboratorio', 'edificio', 'aula', 'encuentra'
    ]
    
    if any(kw in query for kw in proceso_keywords):
        return 'Procesos'
    elif any(kw in query for kw in ubicacion_keywords):
        return 'Ubicaciones'
    else:
        return 'General'

def necesita_llamar_dialog(session_id, mensaje):
    estado = obtener_estado_conversacion(session_id)
    tipo_actual = estado.get("tipo_consulta")
    proceso_actual = estado.get("proceso_actual")
    
    if tipo_actual is None:
        return True, "Primera consulta"
    
    tipo_nuevo = clasificar_mensaje_localmente(mensaje)
    
    if tipo_nuevo != tipo_actual and tipo_nuevo != 'General':
        return True, f"Cambio de tipo: {tipo_actual} → {tipo_nuevo}"
    
    if tipo_actual == "Procesos" and tipo_nuevo == "Procesos":
        procesos_conocidos = ['servicio social', 'titulacion', 'kardex', 'constancia']
        for proc in procesos_conocidos:
            if proc in mensaje.lower() and proceso_actual and proc not in proceso_actual.lower():
                return True, f"Cambio de proceso: {proceso_actual} → {proc}"
    
    return False, "Misma conversación en curso"

def extraer_nombre_proceso(mensaje):
    """
    Extrae el nombre del proceso del mensaje del usuario
    Retorna el nombre normalizado del proceso o None
    """
    mensaje_lower = mensaje.lower()
    
    # Mapeo de los procesos (aun falta poner de ciertos procesos)
    procesos_mapeo = {
        'servicio social': 'servicio social',
        'servicio': 'servicio social',
        'titulacion': 'titulación',
        'titulo': 'titulación',
        'titularme': 'titulación',
        'kardex': 'kardex',
        'constancia': 'constancia',
        'creditos': 'créditos',
        'credito': 'créditos'
    }
    
    # Buscar cual proceso menciona
    for keyword, proceso_oficial in procesos_mapeo.items():
        if keyword in mensaje_lower:
            return proceso_oficial
    
    return None

def construir_pregunta_dialog(mensaje_original, tipo_consulta):
    """
    Construye una pregunta estandarizada para enviar a Dialog
    en lugar del mensaje original del usuario
    """
    if tipo_consulta == "Procesos":
        # Extraer nombre del proceso
        nombre_proceso = extraer_nombre_proceso(mensaje_original)
        
        if nombre_proceso:

            # Pregunta estandarizada
            pregunta_dialog = f"me explicas el procedimiento para mi {nombre_proceso}"
            # Esta pregunta es la que reconoce Dialog, si no esta textualmente de esta manera puede no regresar nada

            print(f"Pregunta original: '{mensaje_original}'")
            print(f"Pregunta a Dialog: '{pregunta_dialog}'\n")
            return pregunta_dialog
        else:
            # Si no se pudo extraer, usar pregunta genérica
            print(f"No se pudo extraer nombre del proceso de: '{mensaje_original}'")
            return "cuales son los procesos disponibles"
    
    elif tipo_consulta == "Ubicaciones":
        # Para ubicaciones, mantener mensaje original por ahora
        return mensaje_original
    
    else:
        return mensaje_original

def procesar_mensaje(mensaje, session_id=None):
    print(f"\n{'='*60}")
    print(f"PROCESANDO MENSAJE: {mensaje}")
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

    # Detectar despedidas
    if es_despedida(mensaje):
        respuesta_final = "¡De nada! Cualquier cosa me preguntas 😊"
        
        Contexto.objects.create(
            session_id=session_id,
            role="ASSISTANT",
            contenido=respuesta_final,
            fecha=timezone.now()
        )
        
        print(f"Despedida detectada\n")
        return respuesta_final, session_id
    
    debe_llamar_dialog, razon = necesita_llamar_dialog(session_id_str, mensaje)
    print(f"¿Llamar a Dialog? {debe_llamar_dialog} - Razón: {razon}\n")
    
    estado = obtener_estado_conversacion(session_id_str)
    
    try:
        if debe_llamar_dialog:
            print("Llamando a DialogFlow...")

            # Clasifica primero para saber qué tipo de pregunta construir
            tipo_clasificado = clasificar_mensaje_localmente(mensaje)
            # Construye la pregunta estandarizada
            pregunta_para_dialog = construir_pregunta_dialog(mensaje, tipo_clasificado)

            # Envia la pregunta estandarizada a Dialog
            dialogflow_result = detect_intent_texts(session_id_str, pregunta_para_dialog)
            
            if isinstance(dialogflow_result, str):
                print(f"Error en DialogFlow: {dialogflow_result}")
                respuesta_final = "Hubo un problema procesando tu consulta. ¿Podrías reformular tu pregunta?"
                tipo_consulta = "Error"
            else:
                parametros = dialogflow_result.get('parameters', {})
                tipo_consulta = parametros.get('consulta', 'General')
                print(f"DialogFlow respondió. Tipo: {tipo_consulta}")
                print(f"Parámetros: {parametros}\n")
                
                print("Consultando base de datos...")
                
                if tipo_consulta == "Procesos":
                    proceso_nombre = parametros.get('proceso_nombre', '') or parametros.get('proceso', '')
                    
                    if proceso_nombre:
                        print(f"Trayendo TODO el proceso: {proceso_nombre}")
                        datos_bd = buscar_proceso_completo(proceso_nombre)
                        
                        if datos_bd:
                            actualizar_estado_conversacion(
                                session_id_str,
                                proceso_actual=proceso_nombre,
                                info_proceso=datos_bd,
                                tipo_consulta="Procesos"
                            )
                            print(f"Proceso cacheado: {datos_bd.get('total_pasos', 0)} pasos\n")
                        else:
                            print(f"Proceso no encontrado\n")
                    else:
                        print("Listando procesos")
                        datos_bd = {'procesos_disponibles': listar_todos_procesos()}
                    
                    tipo_consulta_detallado = 'Procesos-Completo'
                
                elif tipo_consulta == "Ubicaciones":
                    edificio_nombre = parametros.get('edificio', '')
                    salon_numero = parametros.get('salon', '')
                    
                    if salon_numero:
                        datos_bd = buscar_salon(salon_numero)
                        tipo_consulta_detallado = 'Ubicaciones-Salon'
                    elif edificio_nombre:
                        datos_bd = buscar_edificio(edificio_nombre)
                        tipo_consulta_detallado = 'Ubicaciones-Edificio'
                    else:
                        datos_bd = {'edificios_disponibles': listar_todos_edificios()}
                        tipo_consulta_detallado = 'Ubicaciones-Lista'
                    
                    actualizar_estado_conversacion(session_id_str, tipo_consulta="Ubicaciones")
                
                else:
                    datos_bd = None
                    tipo_consulta_detallado = 'General'
                
                prompt_usuario = construir_prompt_inicial(mensaje, datos_bd, tipo_consulta)
                
                if tipo_consulta in ['Procesos', 'Ubicaciones']:
                    Consulta.objects.create(
                        session_id=session_id,
                        modulo_consulta=tipo_consulta.upper(),
                        tipo_consulta=tipo_consulta_detallado,
                        fecha=timezone.now()
                    )
        else:
            print("Usando cache...")
            info_proceso = estado.get("info_proceso")
            
            if info_proceso:
                print(f"Cache disponible\n")
                prompt_usuario = construir_prompt_con_info_proceso(mensaje, info_proceso)
            else:
                print("Sin cache\n")
                prompt_usuario = {
                    "role": "user",
                    "content": f"PREGUNTA: '{mensaje}'\n\nResponde basándote en contexto previo."
                }
        
        print("Llamando a Llama...")
        mensajes_previos = obtener_contexto_reciente(session_id_str)
        mensajes_completos = [construir_prompt_sistema()] + mensajes_previos + [prompt_usuario]
        
        print("\n===== MENSAJES AL MODELO =====")
        for i, m in enumerate(mensajes_completos, 1):
            preview = m['content'][:100] + "..." if len(m['content']) > 100 else m['content']
            print(f"[{i}] {m['role']}: {preview}")
        print("===== FIN =====\n")
        
        respuesta_final = ollama_respuesta(mensajes_completos)
        print(f"Respuesta: {respuesta_final[:80]}...\n")
    
    except Exception as e:
        print(f"Error: {e}")
        respuesta_final = "Lo siento, hubo un error. Intenta de nuevo."
    
    Contexto.objects.create(
        session_id=session_id,
        role="ASSISTANT",
        contenido=respuesta_final,
        fecha=timezone.now()
    )
    
    print(f"{'='*60}\nPROCESO COMPLETADO\n{'='*60}\n")
    
    return respuesta_final, session_id