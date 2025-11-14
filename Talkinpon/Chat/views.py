# Talkinpon/Chat/views.py

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Contexto
from .utils import procesar_mensaje
import json


def chat_ollama(request):
    #  Vista HTML temporal para pruebas (mantener para debugging)
    session_id = request.session.get("session_id", None)
    respuesta = ""
    
    if request.method == "POST":
        mensaje = request.POST.get("user_input", "").strip()
        if mensaje:
            respuesta, session_id = procesar_mensaje(mensaje, session_id)
            request.session["session_id"] = str(session_id)
            # Guarda session_id en sesión del navegador
    # Recupera todo el historial de la sesión actual
    historial = Contexto.objects.filter(session_id=session_id).order_by("fecha") if session_id else []
    
    return render(request, "chat.html", {
        "historial": historial,
        "respuesta": respuesta
    })
    # Vista temporal 

@csrf_exempt
def chat_front(request):
    """
    Endpoint principal para React
    POST /api/chat/
    
    Recibe: {"mensaje": "...", "session_id": "..." (opcional)}
    Retorna: {"reply": "...", "session_id": "..."}
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            mensaje = data.get("mensaje", "").strip()
            session_id = data.get("session_id", None)
            
            if not mensaje:
                return JsonResponse({
                    "error": "Mensaje vacío",
                    "reply": "Por favor escribe algo para poder ayudarte."
                }, status=400)
            
            # PROCESAR MENSAJE (DialogFlow → BD → IA)
            respuesta_texto, session_id = procesar_mensaje(mensaje, session_id)
            
            return JsonResponse({
                "reply": respuesta_texto,
                "session_id": str(session_id)
            })
        
        except json.JSONDecodeError:
            return JsonResponse({
                "error": "JSON inválido",
                "reply": "Hubo un problema con el formato del mensaje."
            }, status=400)
        
        except Exception as e:
            print(f"Error en chat_front: {e}")
            return JsonResponse({
                "error": str(e),
                "reply": "Lo siento, hubo un error procesando tu consulta."
            }, status=500)
    
    return JsonResponse({
        "error": "Método no permitido",
        "reply": "Solo se aceptan peticiones POST."
    }, status=405)

@csrf_exempt
def borrar_contexto(request):
    """
    Borra TODOS los registros Contexto asociados a un session_id.
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            session_id = data.get("session_id", None)

            if not session_id:
                return JsonResponse({"error": "session_id requerido"}, status=400)

            Contexto.objects.filter(session_id=session_id).delete()

            return JsonResponse({
                "status": "ok",
                "msg": "Contexto eliminado correctamente"
            })

        except Exception as e:
            return JsonResponse({
                "error": str(e)
            }, status=500)

    return JsonResponse({"error": "Método no permitido"}, status=405)













'''
@csrf_exempt
def chat_ubicaciones(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            mensaje = data.get("mensaje", "").lower()
            
            # respuestas predefinidas
            if "hola" in mensaje:
                reply = "¡Hola! Este es un mensaje de prueba para Ubicaciones."
            elif "ubicacion" in mensaje:
                reply = "Aquí podrías ver la ubicación de los edificios y salones."
            else:
                reply = "Prueba con 'hola' o 'ubicacion'."
            
            return JsonResponse({"reply": reply})
        except:
            return JsonResponse({"error": "Error al procesar el mensaje"}, status=400)
    return JsonResponse({"error": "Método no permitido"}, status=405)


@csrf_exempt
def chat_procesos(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            mensaje = data.get("mensaje", "").lower()
            
            # respuestas predefinidas
            if "hola" in mensaje:
                reply = "¡Hola! Este es un mensaje de prueba para Procesos."
            elif "proceso" in mensaje:
                reply = "Aquí podrías ver los pasos de los procesos administrativos."
            else:
                reply = "Prueba con 'hola' o 'proceso'."
            
            return JsonResponse({"reply": reply})
        except:
            return JsonResponse({"error": "Error al procesar el mensaje"}, status=400)
    return JsonResponse({"error": "Método no permitido"}, status=405)
'''


