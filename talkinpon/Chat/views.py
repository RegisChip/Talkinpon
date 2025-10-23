from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

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
