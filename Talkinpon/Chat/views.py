# Talkinpon/Chat/views.py

"""
Vistas del sistema de chat
Maneja las peticiones HTTP y coordina con el sistema de procesamiento
"""

from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Contexto, Consulta
from .utils import procesar_mensaje
from .helpers import limpiar_estado_conversacion
import json

# ==========================================
# UTILIDADES INTERNAS
# ==========================================

def _es_comando_especial(respuesta):
    """
    Determina si una respuesta es un comando especial (dict) o texto normal
    
    Returns:
        tuple (es_especial: bool, tipo_comando: str|None)
    """
    if not isinstance(respuesta, dict):
        return False, None
    
    tipo = respuesta.get('tipo')
    comandos_validos = [
        'abrir_mapa_con_ruta',
        'departamento_con_ruta',
        'abrir_mapa_edificio'  # NUEVO
    ]
    
    return tipo in comandos_validos, tipo

def _formatear_respuesta_para_json(respuesta):
    """
    Formatea una respuesta (dict o string) para enviarla como JSON
    
    Args:
        respuesta: dict con comando especial o string con texto
    
    Returns:
        string o dict serializable
    """
    if isinstance(respuesta, dict):
        # Es un comando especial - lo enviamos como JSON string
        # para que React pueda parsearlo y actuar en consecuencia
        return json.dumps(respuesta, ensure_ascii=False)
    
    # Es texto normal
    return respuesta

def _log_request(mensaje, session_id, saltar_dialog):
    """Imprime información de la petición entrante"""
    print(f"\n{'='*60}")
    print(f"📥 REQUEST de React:")
    print(f"   • Mensaje: {mensaje[:100]}..." if len(mensaje) > 100 else f"   • Mensaje: {mensaje}")
    print(f"   • Session ID: {session_id}")
    print(f"   • Origen: {'Botón' if saltar_dialog else 'Texto libre'}")
    print(f"{'='*60}\n")

def _log_response(respuesta, session_id):
    """Imprime información de la respuesta saliente"""
    print(f"\n{'='*60}")
    print(f"📤 RESPONSE a React:")
    
    es_especial, tipo_comando = _es_comando_especial(respuesta)
    
    if es_especial:
        print(f"   • Tipo: Comando especial ({tipo_comando})")
        print(f"   • Contenido: {json.dumps(respuesta, ensure_ascii=False)[:100]}...")
    else:
        preview = respuesta[:100] + "..." if len(respuesta) > 100 else respuesta
        print(f"   • Tipo: Texto normal")
        print(f"   • Contenido: {preview}")
    
    print(f"   • Session ID: {session_id}")
    print(f"{'='*60}\n")

# ==========================================
# VISTAS PRINCIPALES
# ==========================================

def chat_ollama(request):
    """
    Vista HTML para pruebas/demo
    Renderiza template con historial de conversación
    
    GET: Muestra el chat
    POST: Procesa un mensaje y actualiza el historial
    """
    session_id = request.session.get("session_id", None)
    respuesta = ""
    
    if request.method == "POST":
        mensaje = request.POST.get("user_input", "").strip()
        
        if mensaje:
            print(f"\n[HTML Chat] Procesando: {mensaje}")
            
            # Procesar mensaje
            respuesta_raw, session_id = procesar_mensaje(mensaje, session_id)
            
            # Convertir respuesta a string si es necesario
            if isinstance(respuesta_raw, dict):
                # Para el template HTML, mostrar versión legible del comando
                respuesta = _formatear_comando_para_html(respuesta_raw)
            else:
                respuesta = respuesta_raw
            
            # Guardar session_id
            request.session["session_id"] = str(session_id)
            
            print(f"[HTML Chat] Respuesta generada: {respuesta[:100]}...")
    
    # Obtener historial completo
    historial = []
    if session_id:
        historial = Contexto.objects.filter(
            session_id=session_id
        ).order_by("fecha")
    
    return render(request, "chat.html", {
        "historial": historial,
        "respuesta": respuesta
    })

def _formatear_comando_para_html(comando):
    """Convierte un comando especial en texto legible para HTML"""
    if comando.get('tipo') == 'abrir_mapa_con_ruta':
        return f"🗺️ Ruta: {comando['origen_nombre']} → {comando['destino_nombre']}"
    
    if comando.get('tipo') == 'departamento_con_ruta':
        return f"📍 {comando['departamento']} (Edificio {comando['destino_nombre']})"
    
    if comando.get('tipo') == 'abrir_mapa_edificio':
        return f"🗺️ Ubicación del Edificio {comando['edificio_nombre']}"
    
    return str(comando)

@csrf_exempt
def chat_front(request):
    """
    Endpoint principal para el frontend React
    
    POST /api/chat/
    
    Request body:
    {
        "mensaje": "string",
        "session_id": "string (opcional)",
        "saltar_dialog": boolean (opcional, default: false)
    }
    
    Response:
    {
        "reply": "string o JSON string con comando",
        "session_id": "string"
    }
    
    Comandos especiales en reply (como JSON string):
    - abrir_mapa_con_ruta: Indica que React debe mostrar mapa con ruta
    - departamento_con_ruta: Similar a abrir_mapa_con_ruta
    """
    
    # Solo aceptar POST
    if request.method != "POST":
        return JsonResponse({
            "error": "Método no permitido",
            "reply": "Solo se aceptan peticiones POST."
        }, status=405)
    
    try:
        # ========== PARSING Y VALIDACIÓN ==========
        data = json.loads(request.body)
        
        mensaje = data.get("mensaje", "").strip()
        session_id = data.get("session_id", None)
        saltar_dialog = data.get("saltar_dialog", False)
        
        # Validar mensaje no vacío
        if not mensaje:
            return JsonResponse({
                "error": "Mensaje vacío",
                "reply": "Por favor escribe algo para poder ayudarte."
            }, status=400)
        
        # Log de petición
        _log_request(mensaje, session_id, saltar_dialog)
        
        # ========== PROCESAMIENTO ==========
        respuesta_raw, session_id_nuevo = procesar_mensaje(
            mensaje, 
            session_id, 
            saltar_dialog
        )
        
        # ========== FORMATEO DE RESPUESTA ==========
        respuesta_formateada = _formatear_respuesta_para_json(respuesta_raw)
        
        # Log de respuesta
        _log_response(respuesta_raw, session_id_nuevo)
        
        # ========== RETORNO ==========
        return JsonResponse({
            "reply": respuesta_formateada,
            "session_id": str(session_id_nuevo)
        })
    
    except json.JSONDecodeError as e:
        print(f"❌ Error JSON: {e}")
        return JsonResponse({
            "error": "JSON inválido",
            "reply": "Hubo un problema con el formato del mensaje."
        }, status=400)
    
    except Exception as e:
        print(f"❌ Error en chat_front: {e}")
        import traceback
        traceback.print_exc()
        
        return JsonResponse({
            "error": str(e),
            "reply": "Lo siento, hubo un error procesando tu consulta."
        }, status=500)

@csrf_exempt
def borrar_contexto(request):
    """
    Limpia el contexto de conversación
    
    POST /api/chat/clear/
    
    Request body:
    {
        "session_id": "string"
    }
    
    Response:
    {
        "status": "ok",
        "msg": "Contexto eliminado",
        "mensajes_eliminados": int,
        "consultas_guardadas": int
    }
    
    Acciones:
    1. Elimina todos los registros de Contexto asociados al session_id
    2. Limpia el cache en memoria (conversaciones_activas)
    3. Mantiene el historial de Consultas para analytics
    """
    
    # Log inicial
    print(f"\n{'='*60}")
    print(f"🗑️  LIMPIEZA DE CONTEXTO")
    print(f"   • Método: {request.method}")
    
    # Solo aceptar POST
    if request.method != "POST":
        print(f"   ❌ Método no permitido")
        print(f"{'='*60}\n")
        return JsonResponse({
            "error": "Método no permitido"
        }, status=405)
    
    try:
        # ========== PARSING Y VALIDACIÓN ==========
        data = json.loads(request.body)
        session_id = data.get("session_id", None)
        
        print(f"   • Session ID: {session_id}")
        
        if not session_id:
            print(f"   ❌ Session ID no proporcionado")
            print(f"{'='*60}\n")
            return JsonResponse({
                "error": "session_id requerido"
            }, status=400)
        
        # ========== CONTEO ANTES DE ELIMINAR ==========
        mensajes_previos = Contexto.objects.filter(
            session_id=session_id
        ).count()
        
        print(f"   • Mensajes encontrados: {mensajes_previos}")
        
        # ========== ELIMINACIÓN ==========
        resultado_delete = Contexto.objects.filter(
            session_id=session_id
        ).delete()
        
        mensajes_eliminados = resultado_delete[0]
        
        print(f"   • Mensajes eliminados: {mensajes_eliminados}")
        
        # ========== LIMPIAR CACHE EN MEMORIA ==========
        limpiar_estado_conversacion(session_id)
        print(f"   ✓ Cache en memoria limpiado")
        
        # ========== CONTEO DE CONSULTAS (NO SE ELIMINAN) ==========
        consultas_guardadas = Consulta.objects.filter(
            session_id=session_id
        ).count()
        
        print(f"   • Consultas guardadas (analytics): {consultas_guardadas}")
        print(f"{'='*60}\n")
        
        # ========== RETORNO ==========
        return JsonResponse({
            "status": "ok",
            "msg": f"Contexto eliminado correctamente",
            "mensajes_eliminados": mensajes_eliminados,
            "consultas_guardadas": consultas_guardadas
        })
    
    except json.JSONDecodeError as e:
        print(f"   ❌ Error JSON: {e}")
        print(f"{'='*60}\n")
        return JsonResponse({
            "error": "JSON inválido"
        }, status=400)
    
    except Exception as e:
        print(f"   ❌ Error: {e}")
        import traceback
        traceback.print_exc()
        print(f"{'='*60}\n")
        
        return JsonResponse({
            "error": str(e)
        }, status=500)

# ==========================================
# VISTAS ADICIONALES (OPCIONALES)
# ==========================================

@csrf_exempt
def obtener_historial(request):
    """
    Obtiene el historial de conversación
    
    POST /api/chat/history/
    
    Request body:
    {
        "session_id": "string",
        "limit": int (opcional, default: 50)
    }
    
    Response:
    {
        "historial": [
            {
                "role": "user" | "assistant",
                "content": "string",
                "fecha": "ISO datetime"
            },
            ...
        ]
    }
    """
    
    if request.method != "POST":
        return JsonResponse({
            "error": "Método no permitido"
        }, status=405)
    
    try:
        data = json.loads(request.body)
        session_id = data.get("session_id", None)
        limit = data.get("limit", 50)
        
        if not session_id:
            return JsonResponse({
                "error": "session_id requerido"
            }, status=400)
        
        # Obtener historial
        contextos = Contexto.objects.filter(
            session_id=session_id
        ).order_by("-fecha")[:limit]
        
        # Formatear para respuesta
        historial = []
        for ctx in reversed(list(contextos)):
            historial.append({
                "role": "user" if ctx.role == "USER" else "assistant",
                "content": ctx.contenido,
                "fecha": ctx.fecha.isoformat()
            })
        
        return JsonResponse({
            "historial": historial
        })
    
    except Exception as e:
        print(f"Error en obtener_historial: {e}")
        return JsonResponse({
            "error": str(e)
        }, status=500)

@csrf_exempt
def health_check(request):
    """
    Health check para verificar que el servicio está funcionando
    
    GET /api/chat/health/
    
    Response:
    {
        "status": "ok",
        "service": "chat",
        "version": "2.0"
    }
    """
    return JsonResponse({
        "status": "ok",
        "service": "chat",
        "version": "2.0"
    })