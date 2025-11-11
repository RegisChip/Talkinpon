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
    
    # Palabras clave para 'Ubicaciones'
    ubicacion_keywords = ['donde', 'ubicación', 'esta', 'salón', 'laboratorio', 'edificio']
    
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

    if consulta == 'Procesos':
        augmented_query = f"consulta proceso: {user_query}"
    elif consulta == 'Ubicaciones':
        augmented_query = f"consulta ubicacion: {user_query}"
    else:
        augmented_query = user_query

    # Crear el cliente de sesión
    session_client = dialogflow.SessionsClient()
    session_path = session_client.session_path(PROJECT_ID, session_id)
    
    #Crear el input de la consulta
    text_input = dialogflow.TextInput(text=user_query, language_code=LANGUAGE_CODE)
    query_input = dialogflow.QueryInput(text=text_input)       
    
    request_dict = {
        "session": session_path,
        "query_input": query_input,
    }
    
    try: 
        # Enviar la solicitud de detección de intención
        response = session_client.detect_intent(
            request=request_dict
        )

       
        # Extraer la respuesta de texto final
        fulfillment_text = response.query_result.fulfillment_text
        
        # Extraer los parámetros (las "palabras clave" o entidades)
        # Esto devuelve un objeto que se convierte fácilmente a diccionario en Python.
        parameters = dict(response.query_result.parameters)
        
        if consulta:
            parameters['consulta'] = consulta
        # Devolver un diccionario con toda la información clave
        return {
            'response_text': fulfillment_text,
            'parameters': parameters
        }
               
        
    except Exception as e:
        print(f"Error al contactar a Dialogflow: {e}")
        return "Lo siento, hubo un error de conexión con el servicio de chat."