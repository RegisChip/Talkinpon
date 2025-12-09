# Talkinpon/Chat/ollama_servidor.py

import requests
import json

OLLAMA_BASE_URL = 'http://localhost:11434'
OLLAMA_MODEL = 'llama-rapido'  # ←  Ahora usa mi modelo personalizado

def respuesta (mensaje):

    '''
    Llama al modelo llama-rapido con configuración optimizada
    
    Args:
        mensaje: Lista de diccionarios con formato [{'role':'user','content':'...'}]
    Returns:
        String con la respuesta del modelo
    '''

    data = {
        "model": OLLAMA_MODEL,
        "messages": mensaje,
        "stream": False,
        "options": {
            # Estos parámetros sobreescriben los del Modelfile si es necesario
            "num_predict": 512, # Respuestas más cortas
            "temperature": 0.2, # Más determinístico
            "top_p": 0.85,
            "top_k": 30,
        }
    }

    try:
        print(f"Llamando a modelo: {OLLAMA_MODEL}")
        
        r = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json=data,
            timeout=30  # Timeout de 30 segundos
        )
        r.raise_for_status()
        
        # Parsear JSON
        try:
            respuesta_json = r.json()
        except json.JSONDecodeError:
            print(f"Error JSON: {r.text}")
            return "[ERROR] No se pudo decodificar la respuesta del modelo"
        
        # Extraer contenido
        contenido = respuesta_json.get("message", {}).get("content", "")
        
        if not contenido:
            print("Respuesta vacía del modelo")
            return "Lo siento, el modelo no generó una respuesta. Intenta reformular tu pregunta."
        
        # Estadísticas (opcional, para debugging)
        eval_count = respuesta_json.get("eval_count", 0)
        eval_duration = respuesta_json.get("eval_duration", 0) / 1e9  # nanosegundos a segundos
        
        if eval_count > 0 and eval_duration > 0:
            tokens_por_seg = eval_count / eval_duration
            print(f"Tokens: {eval_count}, Tiempo: {eval_duration:.2f}s, Velocidad: {tokens_por_seg:.1f} tok/s")
        
        return contenido
    
    except requests.exceptions.Timeout:
        print(" - Timeout al llamar al modelo")
        return "[ERROR] El modelo tardó demasiado en responder. Intenta con una pregunta más simple."
    
    except requests.exceptions.RequestException as e:
        print(f" - Error de conexión: {e}")
        return f"[ERROR] No se pudo conectar con el modelo: {e}"
    
    except Exception as e:
        print(f" - Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        return f"[ERROR] Error procesando la respuesta: {e}"