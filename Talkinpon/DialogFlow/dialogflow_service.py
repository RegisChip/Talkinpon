# Talkinpon/DialogFlow/dialogflow_service.py

from google.cloud import dialogflow
from django.conf import settings
from google.protobuf.struct_pb2 import Struct

# Las variables de configuración se obtienen de settings.py
PROJECT_ID = settings.DIALOGFLOW_PROJECT_ID
LANGUAGE_CODE = settings.DIALOGFLOW_LANGUAGE_CODE

def classify_intent(user_query):
    """Clasifica la consulta del usuario en 'Ubicaciones' o 'Procesos'."""
    query = user_query.lower()

    # Palabras clave para 'Procesos'
    proceso_keywords = ['tramita', 'requisitos', 'procedimiento', 'solicitar', 'kardex', 'titulo', 'servicio social', 'pasos', 'tramitar','paso', 'tramite']

    '''proceso_keywords = [
        'tramita', 'requisitos', 'procedimiento', 'solicitar', 
        'kardex', 'titulo', 'servicio social', 'pasos', 'tramitar',
        'paso', 'tramite', 'proceso', 'como hago', 'como hacer',
        'titulacion', 'constancia', 'credito'
    ]''' # Posibles consultas
    
    # Palabras clave para 'Ubicaciones'
    ubicacion_keywords = ['donde', 'ubicación', 'esta', 'salón', 'laboratorio', 'edificio']

    '''ubicacion_keywords = [
        'donde', 'ubicación', 'esta', 'está', 'salon', 'salón',
        'laboratorio', 'edificio', 'aula', 'encuentra', 'ubicado'
    ]''' # Posibles consultas
    
    
    # Comprobar si la consulta contiene alguna palabra clave de procesos
    if any(keyword in query for keyword in proceso_keywords):
        return 'Procesos'
        
    # Comprobar si la consulta contiene alguna palabra clave de ubicaciones
    if any(keyword in query for keyword in ubicacion_keywords):
        return 'Ubicaciones'
        
    # Valor por defecto si no se encuentra coincidencia clara
    return ''

def detect_intent_texts(session_id, user_query):
    """
    Llama a la API de Dialogflow y extrae la respuesta de texto (fulfillment_text).
    """
    consulta= classify_intent(user_query)
    
    # Crear query aumentada si se detectó tipo
    if consulta == 'Procesos':
        augmented_query = f"consulta proceso: {user_query}"
    elif consulta == 'Ubicaciones':
        augmented_query = f"consulta ubicacion: {user_query}"
    else:
        augmented_query = user_query

    # Print para ver que se esta enviando
    print("Enviando a Dialogflow:", augmented_query)

    try:
        # Crear el cliente de sesión
        session_client = dialogflow.SessionsClient()
        session_path = session_client.session_path(PROJECT_ID, session_id)
        
        # Crear el input de la consulta
        text_input = dialogflow.TextInput(text=augmented_query, language_code=LANGUAGE_CODE)
        query_input = dialogflow.QueryInput(text=text_input)       
        
        request_dict = {
            "session": session_path,
            "query_input": query_input,
        }
        
        # Enviar la solicitud de detección de intención
        response = session_client.detect_intent(request=request_dict)
       
        # Extraer la respuesta de texto final
        fulfillment_text = response.query_result.fulfillment_text
        
        # Extraer los parámetros (las "palabras clave" o entidades)
        parameters = dict(response.query_result.parameters)

        # Print para ver que regresa Dialog
        print("Respuesta de Dialogflow:", fulfillment_text)
        print("Parámetros detectados:", parameters)
        
        # Agregar tipo de consulta si se detectó
        if consulta:
            parameters['consulta'] = consulta
        
        # Devolver un diccionario con toda la información clave
        return {
            'response_text': fulfillment_text,
            'parameters': parameters
        }
        
    except Exception as e:
        print(f"Error al contactar a Dialogflow: {e}")
        
        # FALLBACK: Si DialogFlow falla, usar solo clasificación básica
        # Esto permite que el sistema siga funcionando aunque DialogFlow esté caído
        return {
            'response_text': 'Procesando tu consulta...',
            'parameters': {
                'consulta': consulta if consulta else 'General'
            }
        }