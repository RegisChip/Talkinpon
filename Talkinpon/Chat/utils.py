# Talkinpon/Chat/utils.py

# Lógica principal: DialogFlow → Base de Datos → IA → Respuesta

from .ollama_servidor import respuesta as ollama_respuesta
from .models import Contexto, Consulta
from .database_queries import (
    buscar_proceso, 
    buscar_paso_especifico, 
    buscar_edificio, 
    buscar_salon,
    listar_todos_procesos,
    listar_todos_edificios,
    construir_identificador_paso
)
from DialogFlow.dialogflow_service import detect_intent_texts
from django.utils import timezone
import uuid
import json



def construir_prompt_para_ia(user_query, datos_bd, tipo_consulta):
    """
    Construye el prompt que se enviará a la IA con los datos de la BD
    """
    if not datos_bd:
        return [{
            "role": "user",
            "content": f"El usuario pregunta: '{user_query}'. No se encontró información en la base de datos. Discúlpate amablemente y sugiere verificar la consulta."
        }]
    
    # Convertir datos a JSON legible
    datos_json = json.dumps(datos_bd, indent=2, ensure_ascii=False)

    prompt = ""
    
    if tipo_consulta == "Procesos":
        if 'pasos' in datos_bd:  # Es un proceso completo
            prompt = f"""Eres un asistente universitario del Instituto Tecnológico de Morelia.
            
            Tu trabajo es explicar procesos administrativos de manera clara, amigable y profesional.
            
            El usuario preguntó: "{user_query}"
            
            Aquí está la información oficial del proceso desde la base de datos:
            
            {datos_json}
            
            INSTRUCCIONES:
            1. Explica el proceso de forma natural y ordenada
            2. Menciona primero los requisitos generales si los hay
            3. Luego explica los pasos de manera secuencial y clara
            4. Para cada paso importante menciona: número, actividad, tiempo estimado y responsable
            5. Si hay requisitos específicos en algún paso, méncionalos
            6. NO digas que obtuviste esta información de un JSON o base de datos
            7. Habla como si conocieras perfectamente el proceso
            8. Sé conciso pero completo
            
            Responde ahora:"""
        
        elif 'numero' in datos_bd:  # Es un paso específico
            prompt = f"""Eres un asistente universitario del Instituto Tecnológico de Morelia.
                        
            El usuario preguntó sobre un paso específico: "{user_query}"
            
            Aquí está la información del paso:
            
            {datos_json}
            
            Explica este paso de forma clara: qué se hace, quién es responsable, cuánto tiempo toma y qué requisitos tiene.
            NO menciones que obtuviste la información de una base de datos.
            
            Responde:"""
    
    elif tipo_consulta == "Ubicaciones":
        if 'salones' in datos_bd:  # Es un edificio
            prompt = f"""Eres un asistente universitario del Instituto Tecnológico de Morelia.

            El usuario preguntó sobre una ubicación: "{user_query}"

            Aquí está la información del edificio:

            {datos_json}

            Explica de forma amigable: qué es el edificio, para qué se usa, dónde está ubicado (nodo del campus).
            Si preguntan por salones, menciona algunos ejemplos.
            NO menciones coordenadas exactas a menos que sea necesario.

            Responde:"""
        
        elif 'edificio' in datos_bd:  # Es un salón
            prompt = f"""Eres un asistente universitario del Instituto Tecnológico de Morelia.

            El usuario preguntó: "{user_query}"

            Aquí está la información del salón:

            {datos_json}

            Explica dónde está el salón: edificio, piso, capacidad.

            Responde:"""
    
    else:  # Consulta general
        prompt = f"""Eres un asistente universitario del Instituto Tecnológico de Morelia.

        El usuario preguntó: "{user_query}"

        Información disponible:

        {datos_json}

        Responde de forma clara y amigable basándote en esta información.

        Responde:"""
    
    return [{"role": "user", "content": prompt}]


def obtener_datos_desde_bd(parametros):
    """
    Según los parámetros de DialogFlow, consulta la base de datos
    Retorna: (datos_bd, tipo_consulta)
    """
    tipo_consulta = parametros.get('consulta', '')
    print(f"Parámetros recibidos en obtener_datos_desde_bd: {parametros}")
    
    
    # PROCESOS
    if tipo_consulta == 'Procesos':
        # Buscar nombre del proceso
        proceso_nombre = parametros.get('proceso_nombre', '') or parametros.get('proceso', '')
        
        # Buscar paso específico
        paso_numero = parametros.get('paso_numero', '') or parametros.get('paso', '')

        print(f"Proceso: '{proceso_nombre}' | Paso: '{paso_numero}'")
        
        if paso_numero and proceso_nombre:
            # Usuario pregunta por un paso específico de un proceso
            # CONSTRUIR IDENTIFICADOR (SS-03, TIT-02, etc.)
            print(f"Construyendo identificador para {proceso_nombre} - {paso_numero}")
            identificador = construir_identificador_paso(proceso_nombre, paso_numero)
            
            if identificador:
                print(f"Identificador construido: {identificador}")
                datos = buscar_paso_especifico(identificador)
                
                if datos:
                    print(f"Datos encontrados para paso: {datos}")
                    return datos, 'Procesos-Paso'
                else:
                    print(f"No se encontraron datos para identificador: {identificador}")
                    return None, 'Procesos-Paso-NoEncontrado'
            else:
                print(f"No se pudo construir identificador para {proceso_nombre} - {paso_numero}")
                return None, 'Procesos-Paso-Error'
        
        elif paso_numero:
            # Solo tiene número de paso sin proceso
            print(f"Paso especificado sin proceso: {paso_numero}")
            return None, 'Procesos-Paso-Sin-Proceso'
        
        elif proceso_nombre:
            # Usuario pregunta por un proceso completo
            print(f"Buscando proceso completo: {proceso_nombre}")
            datos = buscar_proceso(proceso_nombre)
            return datos, 'Procesos-Completo'
        
        else:
            # Usuario pregunta qué procesos hay
            print(f"Listando todos los procesos")
            datos = {'procesos_disponibles': listar_todos_procesos()}
            return datos, 'Procesos-Lista'
    
    # UBICACIONES
    elif tipo_consulta == 'Ubicaciones':
        edificio_nombre = parametros.get('edificio', '') or parametros.get('edificio_nombre', '')
        salon_numero = parametros.get('salon', '') or parametros.get('salon_numero', '')
        
        print(f"Edificio: '{edificio_nombre}' | Salón: '{salon_numero}'")
        
        if salon_numero:
            datos = buscar_salon(salon_numero)
            return datos, 'Ubicaciones-Salon'
        
        elif edificio_nombre:
            datos = buscar_edificio(edificio_nombre)
            return datos, 'Ubicaciones-Edificio'
        
        else:
            datos = {'edificios_disponibles': listar_todos_edificios()}
            return datos, 'Ubicaciones-Lista'
        
    print(f"No se pudo determinar tipo de consulta o no hay datos")
    return None, ''


def procesar_mensaje(mensaje, session_id=None):
    """
    FLUJO PRINCIPAL:
    1. Recibe mensaje del usuario
    2. Envía a DialogFlow para clasificar
    3. Consulta la base de datos según parámetros
    4. Envía datos a la IA para generar respuesta natural
    5. Guarda en Contexto y Consulta
    """

    print(f"\n{'='*60}")
    print(f"PROCESANDO MENSAJE: {mensaje}")
    print(f"{'='*60}\n")
    
    # 1. Crear o usar session_id existente
    if not session_id:
        session_id = uuid.uuid4()
    
    # Guardar mensaje del usuario en Contexto
    Contexto.objects.create(
        session_id=session_id,
        role="USER",
        contenido=mensaje,
        fecha=timezone.now()
    )
    
    # 2. ENVIAR A DIALOGFLOW
    try:
        print("Llamando a DialogFlow...")
        dialogflow_result = detect_intent_texts(str(session_id), mensaje)
        
        if isinstance(dialogflow_result, str):
            # Error de DialogFlow
            print(f"Error en DialogFlow: {dialogflow_result}")
            respuesta_final = dialogflow_result
            tipo_consulta = "Error"
        else:
            # DialogFlow retornó correctamente
            parametros = dialogflow_result.get('parameters', {})
            print(f"DialogFlow respondió. Parámetros: {parametros}")
            
            # 3. CONSULTAR BASE DE DATOS
            print("\nConsultando base de datos...")
            datos_bd, tipo_consulta_detallado = obtener_datos_desde_bd(parametros)

            if datos_bd:
                print(f"Datos encontrados en BD:")
                print(f"{json.dumps(datos_bd, indent=2, ensure_ascii=False)}\n")
            else:
                print(f"No se encontraron datos en BD. Tipo: {tipo_consulta_detallado}\n")
            
            # Extraer tipo general (Procesos o Ubicaciones)
            tipo_consulta = parametros.get('consulta', 'General')
            
            # 4. CONSTRUIR PROMPT PARA LA IA
            print("Construyendo prompt para IA...")
            prompt_ia = construir_prompt_para_ia(mensaje, datos_bd, tipo_consulta)
            
            # 5. LLAMAR A LA IA (OLLAMA)
            print("Llamando a Ollama...")
            respuesta_final = ollama_respuesta(prompt_ia)
            print(f"Respuesta de Ollama recibida: {respuesta_final[:100]}...\n")
            
            # 6. GUARDAR EN CONSULTA
            if tipo_consulta in ['Procesos', 'Ubicaciones']:
                Consulta.objects.create(
                    modulo_consulta=tipo_consulta.upper(),
                    tipo_consulta=tipo_consulta_detallado,
                    fecha=timezone.now()
                )
                print(f"Consulta guardada en BD")
    
    except Exception as e:
        print(f"Error en procesar_mensaje: {e}")
        respuesta_final = "Lo siento, hubo un error procesando tu consulta. Por favor intenta de nuevo."
        tipo_consulta = "Error"
    
    # 7. GUARDAR RESPUESTA DEL ASISTENTE EN CONTEXTO
    Contexto.objects.create(
        session_id=session_id,
        role="ASSISTANT",
        contenido=respuesta_final,
        fecha=timezone.now()
    )

    print(f"\n{'='*60}")
    print(f"PROCESO COMPLETADO")
    print(f"{'='*60}\n")
    
    return respuesta_final, session_id