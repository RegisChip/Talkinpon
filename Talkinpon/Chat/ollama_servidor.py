# Talkinpon/Chat/ollama_servidor.py

import requests
import json

OLLAMA_BASE_URL = 'http://localhost:11434'
OLLAMA_MODEL = 'llama3.1:8b'

def respuesta (mensaje):

    # mensaje: es una lista que contiene un diccionario
    # [{'role':'user','content':'Hola'}, ...]

    data = {
        "model": OLLAMA_MODEL,
        "messages": mensaje,
        "stream": False,
        "options": {
            "num_predict": 150,  # Máximo 150 tokens (aprox 100-120 palabras)
            "temperature": 0.7,  # Un poco más creativo pero controlado
        }
    }

    try:
        r = requests.post(f"{OLLAMA_BASE_URL}/api/chat", json=data)
        r.raise_for_status()

        # parsear JSON con seguridad

        try:
            respuesta_json = r.json()
        except json.JSONDecodeError:
            return f"[ERROR JSON] No se pudo decodificar la respuesta: {r.text}"
            # Si falla el parse, mostrara el contenido crudo

        # En /api/chat la respuesta está en message.content
        return respuesta_json.get("message", {}).get("content", "No se pudo generar respuesta")
    
    except requests.exceptions.RequestException as e:
        return f"[ERROR] {e}"