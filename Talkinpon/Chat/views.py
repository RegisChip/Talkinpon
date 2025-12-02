# Talkinpon/Chat/views.py

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Contexto, Consulta
from .utils import procesar_mensaje, limpiar_estado_conversacion
import json

def chat_ollama(request):
    """
    Vista HTML temporal para pruebas
    """
    session_id = request.session.get("session_id", None)
    respuesta = ""
    
    if request.method == "POST":
        mensaje = request.POST.get("user_input", "").strip()
        if mensaje:
            respuesta, session_id = procesar_mensaje(mensaje, session_id)
            request.session["session_id"] = str(session_id)
    
    # Recupera todo el historial de la sesión actual
    historial = Contexto.objects.filter(session_id=session_id).order_by("fecha") if session_id else []
    
    return render(request, "chat.html", {
        "historial": historial,
        "respuesta": respuesta
    })

@csrf_exempt
def chat_front(request):
    """
    Endpoint principal para React
    POST /api/chat/
    
    Recibe: {"mensaje": "...", "session_id": "..." (opcional), "saltar_dialog": true/false}
    Retorna: {"reply": "...", "session_id": "..."}
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            mensaje = data.get("mensaje", "").strip()
            session_id = data.get("session_id", None)
            saltar_dialog = data.get("saltar_dialog", False)  # NUEVO parámetro
            
            if not mensaje:
                return JsonResponse({
                    "error": "Mensaje vacío",
                    "reply": "Por favor escribe algo para poder ayudarte."
                }, status=400)
            
            print(f"\n{'='*60}")
            print(f"REQUEST de React:")
            print(f"--Mensaje: {mensaje}")
            print(f"--Session ID: {session_id}")
            print(f"--Saltar Dialog: {saltar_dialog}")  # NUEVO log
            print(f"{'='*60}\n")
            
            # PROCESAR MENSAJE (Nuevo flujo: con o sin DialogFlow)
            respuesta_texto, session_id = procesar_mensaje(mensaje, session_id, saltar_dialog)
            
            print(f"\n{'='*60}")
            print(f"RESPONSE a React:")
            print(f"--Reply: {respuesta_texto[:100]}...")
            print(f"--Session ID: {session_id}")
            print(f"{'='*60}\n")
            
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
            import traceback
            traceback.print_exc()
            
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
    También limpia el cache en memoria de conversaciones_activas.
    """
    print("\n🚨 ENDPOINT borrar_contexto LLAMADO")  # AGREGAR
    print(f"   Método: {request.method}")  # AGREGAR
    
    if request.method == "POST":
        try:
            print("   Leyendo body...")  # AGREGAR
            data = json.loads(request.body)
            session_id = data.get("session_id", None)
            
            print(f"   Session ID recibido: {session_id}")  # AGREGAR
            
            if not session_id:
                return JsonResponse({"error": "session_id requerido"}, status=400)
            
            print(f"\n{'='*60}")
            print(f"LIMPIANDO CONTEXTO")
            print(f"--Session ID: {session_id}")
            
            # Contar mensajes antes de borrar
            cantidad_total = Contexto.objects.filter(session_id=session_id).count()
            print(f"   Contextos encontrados: {cantidad_total}")  # AGREGAR
            
            # Borrar contexto temporal en BD
            deleted = Contexto.objects.filter(session_id=session_id).delete()
            print(f"   Resultado delete(): {deleted}")  # AGREGAR
            
            # Borrar cache en memoria
            limpiar_estado_conversacion(session_id)
            
            consultas_guardadas = Consulta.objects.filter(session_id=session_id).count()
            
            print(f"---{cantidad_total} mensajes eliminados de BD")
            print(f"---Cache en memoria limpiado")
            print(f"---{consultas_guardadas} consultas permanecen en historial")
            print(f"{'='*60}\n")
            
            return JsonResponse({
                "status": "ok",
                "msg": f"Contexto y cache eliminados ({cantidad_total} mensajes)",
                "consultas_guardadas": consultas_guardadas
            })
        
        except Exception as e:
            print(f"❌ Error en borrar_contexto: {e}")  # AGREGAR
            import traceback
            traceback.print_exc()  # AGREGAR
            return JsonResponse({
                "error": str(e)
            }, status=500)
    
    print("   ⚠️ Método no es POST")  # AGREGAR
    return JsonResponse({
        "error": "Método no permitido"
    }, status=405)