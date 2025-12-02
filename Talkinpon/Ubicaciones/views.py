# Ubicaciones/views.py - VERSIÓN CON LOGS EN TERMINAL

from django.shortcuts import render
from django.http import JsonResponse
from django.db import models
from django.views.decorators.http import require_http_methods
from .models import Ubicacion, Edificio, RelacionU
from Chat.ollama_servidor import respuesta as respuesta_ollama
import heapq
import json
import math


def mapa(request):
    ubicaciones = list(Ubicacion.objects.values('id_ubicacion','pos_x','pos_y','tipo','nom_nodo'))
    relaciones = list(RelacionU.objects.values('id','origen_id','destino_id').distinct())
    return render(request, 'mapa.html', {
        'ubicaciones': json.dumps(ubicaciones),
        'relaciones': json.dumps(relaciones)
    })


def guardar_ubicacion(request):
    if request.method != 'POST':
        return JsonResponse({'error':'Método no permitido'}, status=405)

    data = json.loads(request.body)
    accion = data.get('accion')

    if accion == 'guardar':
        try:
            x = float(data.get('pos_x'))
            y = float(data.get('pos_y'))
        except (TypeError, ValueError):
            return JsonResponse({'error':'Coordenadas inválidas'}, status=400)

        tipo = data.get('tipo','intermedio')
        nombre_edificio = data.get('nombre_edificio','').strip()
        uso = data.get('uso','')
        num_salones = data.get('num_salones',0)
        carreras = data.get('carreras','')

        # Crear nodo
        nodo = Ubicacion(pos_x=x,pos_y=y,tipo=tipo)
        nodo.save()

        # Crear edificio si aplica
        if tipo=='edificio' and nombre_edificio:
            try:
                Edificio.objects.create(
                    nombre=nombre_edificio,
                    uso=uso,
                    num_salones=num_salones,
                    carreras=carreras,
                    ubicacion=nodo
                )
            except Exception as e:
                return JsonResponse({'error':'Error al crear edificio: '+str(e)}, status=400)

        return JsonResponse({'id': nodo.id_ubicacion, 'nom_nodo': nodo.nom_nodo, 'tipo': nodo.tipo})

    elif accion == 'relacion':
        origen_id = data.get('origen')
        destino_id = data.get('destino')
        if not origen_id or not destino_id:
            return JsonResponse({'error':'IDs inválidos'}, status=400)
        try:
            origen = Ubicacion.objects.get(id_ubicacion=origen_id)
            destino = Ubicacion.objects.get(id_ubicacion=destino_id)
            relacion, created = RelacionU.objects.get_or_create(origen=origen,destino=destino)
            return JsonResponse({'id': relacion.id})
        except Ubicacion.DoesNotExist:
            return JsonResponse({'error':'Nodo no encontrado'}, status=404)

    elif accion == 'eliminar_relacion':
        id_relacion = data.get('id_relacion')
        if not id_relacion:
            return JsonResponse({'error':'ID inválido'}, status=400)
        try:
            relacion = RelacionU.objects.get(id=id_relacion)
            if relacion.bidireccional:
                RelacionU.objects.filter(origen=relacion.destino, destino=relacion.origen, bidireccional=False).delete()
            relacion.delete()
            return JsonResponse({'ok': True})
        except RelacionU.DoesNotExist:
            return JsonResponse({'error':'Relación no encontrada'}, status=404)

    elif accion == 'eliminar_nodo':
        id_nodo = data.get('id_nodo')
        if not id_nodo:
            return JsonResponse({'error':'ID inválido'}, status=400)
        try:
            nodo = Ubicacion.objects.get(id_ubicacion=id_nodo)
            # eliminar relaciones
            RelacionU.objects.filter(origen=nodo).delete()
            RelacionU.objects.filter(destino=nodo).delete()
            # eliminar edificio si aplica
            if nodo.tipo == 'edificio':
                Edificio.objects.filter(ubicacion=nodo).delete()
            nodo.delete()
            return JsonResponse({'ok': True})
        except Ubicacion.DoesNotExist:
            return JsonResponse({'error':'Nodo no encontrado'}, status=404)

    return JsonResponse({'error':'Acción no reconocida'}, status=400)


def mapa_interactivo(request):
    # Traer ubicaciones que sean de tipo 'edificio'
    edificios = (
        Edificio.objects
        .select_related('ubicacion')
        .values(
            id=models.F('id_edificio'),
            nombre_edificio=models.F('nombre'),
            pos_x=models.F('ubicacion__pos_x'),
            pos_y=models.F('ubicacion__pos_y'),
            nom_nodo=models.F('ubicacion__nom_nodo')
        )
    )

    return render(request, 'mapa_interactivo.html', {
        'edificios': json.dumps(list(edificios)),
    })


@require_http_methods(["GET"])
def obtener_edificios_json(request):
    """
    Devuelve todos los edificios en formato JSON para consumo de React.
    Endpoint: GET /api/edificios/
    """
    print("\n" + "="*80)
    print("🏢 SOLICITUD DE EDIFICIOS - API")
    print("="*80)
    
    try:
        edificios = Edificio.objects.select_related('ubicacion').all()
        total_edificios = edificios.count()
        
        print(f"📊 Total de edificios en BD: {total_edificios}")
        
        edificios_json = []
        for i, ed in enumerate(edificios, 1):
            edificio_data = {
                'id': ed.id_edificio,
                'nombre_edificio': ed.nombre,
                'pos_x': float(ed.ubicacion.pos_x),
                'pos_y': float(ed.ubicacion.pos_y),
                'tipo': ed.ubicacion.tipo,
                'nom_nodo': ed.ubicacion.nom_nodo,
                'uso': ed.uso or '',
                'num_salones': ed.num_salones,
                'carreras': ed.carreras or '',
                'texto': f"Edificio {ed.nombre} - {ed.uso or 'Edificio académico'}",
                'imagen': f"/edificios/{ed.nombre.lower()}.jpg",
                'posicionMapa': {
                    'top': f"{ed.ubicacion.pos_y}px",
                    'left': f"{ed.ubicacion.pos_x}px"
                }
            }
            edificios_json.append(edificio_data)
            
            print(f"   {i}. {ed.nombre:<20} → ({ed.ubicacion.pos_x:>6.1f}, {ed.ubicacion.pos_y:>6.1f}) | Nodo: {ed.ubicacion.nom_nodo}")
        print(f"\n Todos los edificios procesados correctamente.\n")
        response_data = {
            'edificios': edificios_json,
            'total': len(edificios_json)
        }
        print("es response dsta ha terminado")
        
        # IMPRIMIR JSON COMPLETO
        #print("\n" + "-"*80)
        #print("📤 JSON DE RESPUESTA:")
        #print("-"*80)
        #print(json.dumps(response_data, indent=2, ensure_ascii=False))
        #print("="*80 + "\n")
        
        return JsonResponse(response_data)
        
    except Exception as e:
        print(f"❌ ERROR al obtener edificios: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'error': f'Error al obtener edificios: {str(e)}',
            'edificios': [],
            'total': 0
        }, status=500)


@require_http_methods(["GET"])
def dijkstra_ruta(request):
    """
    Calcula la ruta óptima usando Dijkstra y genera un JSON completo para React.
    Parámetros GET:
        - origen: ID del edificio de origen
        - destino: ID del edificio de destino
    """
    print("\n" + "="*80)
    print("🚀 NUEVA SOLICITUD DE RUTA - Dijkstra")
    print("="*80)

    try:
        # Obtener parámetros
        origen_edificio_id = request.GET.get('origen')
        destino_edificio_id = request.GET.get('destino')

        print(f"📥 PARÁMETROS RECIBIDOS: Origen={origen_edificio_id}, Destino={destino_edificio_id}")

        if not origen_edificio_id or not destino_edificio_id:
            print("❌ ERROR: Faltan parámetros origen y/o destino")
            return JsonResponse({'error': 'Se requieren parámetros origen y destino'}, status=400)

        # Convertir a enteros
        origen_edificio_id = int(origen_edificio_id)
        destino_edificio_id = int(destino_edificio_id)

    except (TypeError, ValueError) as e:
        print(f"❌ ERROR: Parámetros inválidos - {str(e)}")
        return JsonResponse({'error': f'Parámetros inválidos: {str(e)}'}, status=400)

    # Validar que los edificios existan
    try:
        edificio_origen = Edificio.objects.select_related('ubicacion').get(id_edificio=origen_edificio_id)
        edificio_destino = Edificio.objects.select_related('ubicacion').get(id_edificio=destino_edificio_id)

        print(f"🏢 EDIFICIOS ENCONTRADOS: Origen={edificio_origen.nombre}, Destino={edificio_destino.nombre}")

    except Edificio.DoesNotExist:
        print("❌ ERROR: Uno o ambos edificios no existen")
        return JsonResponse({'error': 'Uno o ambos edificios no existen'}, status=404)

    # IDs de ubicación
    ubicacion_origen_id = edificio_origen.ubicacion.id_ubicacion
    ubicacion_destino_id = edificio_destino.ubicacion.id_ubicacion

    if ubicacion_origen_id == ubicacion_destino_id:
        print("⚠️  ADVERTENCIA: El origen y destino son el mismo edificio")
        return JsonResponse({'error': 'El origen y destino son el mismo edificio'}, status=400)

    # Construir grafo
    grafo = construir_grafo()

    if ubicacion_origen_id not in grafo or ubicacion_destino_id not in grafo:
        error_msg = f'Nodo origen o destino no tiene conexiones'
        print(f"❌ ERROR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=404)

    # Ejecutar Dijkstra
    camino_ids, distancia_total = ejecutar_dijkstra(grafo, ubicacion_origen_id, ubicacion_destino_id)
    if not camino_ids:
        error_msg = f'No existe ruta entre "{edificio_origen.nombre}" y "{edificio_destino.nombre}"'
        print(f"❌ ERROR: {error_msg}")
        return JsonResponse({'error': error_msg}, status=404)

    # Obtener coordenadas de todos los nodos en el camino
    ubicaciones_dict = {u.id_ubicacion: u for u in Ubicacion.objects.filter(id_ubicacion__in=camino_ids)}

    camino_coordenadas = []
    for nodo_id in camino_ids:
        u = ubicaciones_dict[nodo_id]
        camino_coordenadas.append({
            'id': u.id_ubicacion,
            'nom_nodo': u.nom_nodo,
            'tipo': u.tipo,
            'pos_x': float(u.pos_x),
            'pos_y': float(u.pos_y)
        })

    # Generar instrucciones textuales
    instrucciones = generar_instrucciones(camino_coordenadas)

    # ====== BLOQUE JSON RUTA ======
    ubicaciones_data = list(Ubicacion.objects.values('id_ubicacion', 'pos_x', 'pos_y', 'tipo', 'nom_nodo'))

    def generar_json_ruta(camino_coordenadas, ubicaciones_data, origen, destino):
        puntos_asociados = []
        tipos = []
        direccion = []
        edificios_cercanos = []
        edificios_agregados = set()

        # Obtener TODOS los edificios con sus nombres reales desde la tabla Edificio
        edificios_db = Edificio.objects.select_related('ubicacion').all()
        edificios_dict = {ed.ubicacion.id_ubicacion: ed.nombre for ed in edificios_db}

        for i, nodo in enumerate(camino_coordenadas):
            # Usar nom_nodo en minúsculas para puntos_asociados
            puntos_asociados.append(nodo['nom_nodo'].lower())
            tipos.append(nodo['tipo'])

            # Dirección hacia siguiente nodo
            if i < len(camino_coordenadas) - 1:
                sig = camino_coordenadas[i + 1]
                dx = sig['pos_x'] - nodo['pos_x']
                dy = sig['pos_y'] - nodo['pos_y']
                
                if abs(dx) > abs(dy):
                    dir_text = 'derecha' if dx > 0 else 'izquierda'
                elif abs(dy) > 0:
                    dir_text = 'abajo' if dy > 0 else 'arriba'
                else:
                    dir_text = 'mismo lugar'
                direccion.append(dir_text)

            # Buscar edificios cercanos al nodo actual
            cercanos_nodo = []
            
            # Solo buscar en ubicaciones que sean edificios
            edificios_list = [e for e in ubicaciones_data if e['tipo'] == 'edificio']
            
            for e in edificios_list:
                # Ignorar el nodo mismo
                if e['id_ubicacion'] == nodo['id']:
                    continue
                
                # Obtener el nombre real del edificio desde edificios_dict
                nombre_edificio = edificios_dict.get(e['id_ubicacion'], e['nom_nodo'])
                
                # No repetir edificios ya agregados
                if nombre_edificio in edificios_agregados:
                    continue
                
                # Calcular distancia
                dist = math.sqrt((e['pos_x'] - nodo['pos_x'])**2 + (e['pos_y'] - nodo['pos_y'])**2)
                
                # Distancia máxima para considerar "cercano"
                if dist <= 30:
                    cercanos_nodo.append({
                        'nombre': nombre_edificio,  # Nombre del edificio (A, B, C...)
                        'tipo': 'edificio'
                    })
                    edificios_agregados.add(nombre_edificio)
            
            # Si no hay edificios cercanos, agregar lista vacía
            edificios_cercanos.append(cercanos_nodo if len(cercanos_nodo) > 0 else [])
        
        # La dirección del último nodo se mantiene como vacío porque no hay siguiente nodo
        direccion.append('')

        return {
            'puntos_asociados': puntos_asociados,
            'tipos': tipos,
            'direccion': direccion,
            'edificios_cercanos': edificios_cercanos,
            'origen': {
                'id': origen.id_edificio,
                'nombre': origen.nombre
            },
            'destino': {
                'id': destino.id_edificio,
                'nombre': destino.nombre
            },
            'instrucciones': generar_instrucciones(camino_coordenadas),
            'nodos_visitados': len(camino_coordenadas),
            'camino_coordenadas': camino_coordenadas
        }
        
    # Generar JSON completo de la ruta
    json_ruta = generar_json_ruta(camino_coordenadas, ubicaciones_data, edificio_origen, edificio_destino)

    # Mostrar en consola SOLO los campos necesarios
    # Este es el json que deben ocupar para mandarselo al modelo de IA
    json_para_consola = {
        'puntos_asociados': json_ruta['puntos_asociados'],
        'tipos': json_ruta['tipos'],
        'direccion': json_ruta['direccion'],
        'edificios_cercanos': json_ruta['edificios_cercanos'],
        'origen': json_ruta['origen'],
        'destino': json_ruta['destino']
    }

    print("\n📤 JSON DE RUTA (CONSOLA):")
    print(json.dumps(json_para_consola, indent=2, ensure_ascii=False))
    print("\n Esta en la linea 363, json para mandarselo al modelos de IA")

    # ====== INICIO: BLOQUE DE INTEGRACIÓN CON OLLAMA ======
    descripcion_ia = "No se pudo generar una descripción detallada en este momento." # Default message
    try:
        # 1. Convertir el JSON para la IA en un string formateado
        contexto_ruta_str = json.dumps(json_para_consola, indent=2, ensure_ascii=False)

        # 2. Crear el prompt para el modelo
        prompt = f"""Eres un **asistente virtual amigable del Tecnológico de Morelia**. Tu tarea es generar una descripción textual clara y fácil de seguir para guiar a un estudiante desde un punto de origen a uno de destino dentro del campus.

        Utiliza el siguiente JSON como contexto, que describe la ruta calculada:
        {contexto_ruta_str}

        Basado en el JSON, genera una guía de ruta paso a paso siguiendo estrictamente estas reglas de formato:

        Reglas de Generación

        
        1. Formato de Lista Estricto: Genera la ruta como una lista ordenada de pasos. Cada paso debe ser un elemento separado de la lista.
        2. Verbos Imperativos: Cada paso debe iniciar con un verbo de acción en modo imperativo (Ej: "Dirígete", "Gira", "Camina", "Continúa").
        3. Puntos de Referencia: Menciona los puntos de referencia (edificios cercanos) cuando estén disponibles en los datos para ayudar en la navegación.
        4. Output Limpio: No incluyas el JSON en tu respuesta. La respuesta debe ser únicamente el saludo, la guía textual en lista y el mensaje final.

        Ejemplo del formato de lista deseado (debe ser estricto):
        * Dirígete al Norte por el pasillo principal.
        * Gira a la derecha frente al Edificio Z.
        * Camina hasta la segunda puerta.
        * Has llegado a tu destino.
        """

        # 3. Preparar el mensaje para la función respuesta_ollama
        mensaje_para_ia = [{"role": "user", "content": prompt}]

        # 4. Llamar al servidor de Ollama
        print("\n🤖 Enviando solicitud a Ollama para generar descripción...")
        descripcion_generada = respuesta_ollama(mensaje_para_ia)
        
        # 5. Validar y asignar la respuesta
        if not descripcion_generada.startswith("[ERROR]"):
            descripcion_ia = descripcion_generada
            print("✅ Descripción generada por IA recibida con éxito.")
        else:
            print(f"⚠️  ADVERTENCIA: Falló la llamada a Ollama: {descripcion_generada}")
            # Se usará el mensaje por defecto.

    except Exception as e:
        print(f"❌ ERROR CRÍTICO al intentar comunicarse con Ollama: {str(e)}")
        # En caso de cualquier error, se mantiene el mensaje por defecto.

    # 6. Añadir la descripción al JSON de respuesta final
    json_ruta['descripcion_ia'] = descripcion_ia
    # ====== FIN: BLOQUE DE INTEGRACIÓN CON OLLAMA ======

    # Retornar JsonResponse completo (CON camino_coordenadas y descripcion_ia para React)
    return JsonResponse(json_ruta)

def construir_grafo():
    """
    Construye el grafo completo usando TODAS las relaciones de RelacionU.
    """
    grafo = {}
    
    # CRÍTICO: Obtener TODAS las relaciones de RelacionU
    relaciones = RelacionU.objects.select_related(
        'origen', 'destino'
    ).all()
    
    print(f"\n🔍 DEBUG: Se encontraron {relaciones.count()} relaciones en RelacionU")
    
    contador_relaciones = 0
    relaciones_ignoradas = 0
    
    for rel in relaciones:
        tipo_origen = rel.origen.tipo
        tipo_destino = rel.destino.tipo
        
        # REGLA IMPORTANTE: No permitir conexión directa edificio → edificio
        if tipo_origen == 'edificio' and tipo_destino == 'edificio':
            relaciones_ignoradas += 1
            print(f"⚠️  Ignorando conexión directa: {rel.origen.nom_nodo} → {rel.destino.nom_nodo} (ambos son edificios)")
            continue
        
        id_origen = rel.origen.id_ubicacion
        id_destino = rel.destino.id_ubicacion
        
        # Usar peso si existe y es válido, sino usar distancia
        peso = rel.peso if rel.peso and rel.peso > 0 else rel.distancia
        
        if peso is None or peso <= 0:
            print(f"⚠️  Ignorando relación sin peso válido: {rel.origen.nom_nodo} → {rel.destino.nom_nodo}")
            continue
        
        # Inicializar nodos si no existen en el grafo
        if id_origen not in grafo:
            grafo[id_origen] = []
        if id_destino not in grafo:
            grafo[id_destino] = []
        
        # Agregar arista origen → destino
        grafo[id_origen].append((id_destino, peso))
        contador_relaciones += 1
        print(f"✅ Agregada: {rel.origen.nom_nodo} → {rel.destino.nom_nodo} (peso: {peso:.2f})")
        
        # Si es bidireccional, agregar también destino → origen
        if rel.bidireccional:
            grafo[id_destino].append((id_origen, peso))
            contador_relaciones += 1
            print(f"↔️  Bidireccional: {rel.destino.nom_nodo} → {rel.origen.nom_nodo} (peso: {peso:.2f})")
    
    print(f"\n📊 RESUMEN del grafo:")
    print(f"   - Total nodos en el grafo: {len(grafo)}")
    print(f"   - Total conexiones agregadas: {contador_relaciones}")
    print(f"   - Relaciones ignoradas (edificio→edificio): {relaciones_ignoradas}")
    print(f"   - Nodos en el grafo: {list(grafo.keys())}\n")
    
    return grafo


def ejecutar_dijkstra(grafo, origen, destino):
    """
    Implementación del algoritmo de Dijkstra.
    """
    # Inicializar estructuras
    distancias = {nodo: float('inf') for nodo in grafo}
    previos = {nodo: None for nodo in grafo}
    distancias[origen] = 0
    
    # Priority queue: (distancia, nodo_id)
    pq = [(0, origen)]
    visitados = set()
    
    while pq:
        dist_actual, nodo_actual = heapq.heappop(pq)
        
        # Si ya visitamos este nodo, continuar
        if nodo_actual in visitados:
            continue
        
        visitados.add(nodo_actual)
        
        # Si llegamos al destino, podemos terminar
        if nodo_actual == destino:
            break
        
        # Explorar vecinos
        if nodo_actual in grafo:
            for vecino, peso in grafo[nodo_actual]:
                if vecino in visitados:
                    continue
                
                nueva_distancia = dist_actual + peso
                
                if nueva_distancia < distancias[vecino]:
                    distancias[vecino] = nueva_distancia
                    previos[vecino] = nodo_actual
                    heapq.heappush(pq, (nueva_distancia, vecino))
    
    # Reconstruir el camino desde destino hasta origen
    camino = []
    nodo_actual = destino
    
    while nodo_actual is not None:
        camino.append(nodo_actual)
        nodo_actual = previos[nodo_actual]
    
    # Invertir para tener el camino de origen a destino
    camino.reverse()
    
    # Validar que el camino sea válido (debe empezar en origen)
    if not camino or camino[0] != origen:
        return [], float('inf')
    
    return camino, distancias[destino]


def generar_instrucciones(camino_coordenadas):
    """
    Genera instrucciones textuales paso a paso.
    """
    if len(camino_coordenadas) < 2:
        return []
    
    instrucciones = []
    
    # Primera instrucción
    primer_nodo = camino_coordenadas[0]
    instrucciones.append(f"Inicio en: {primer_nodo['nom_nodo']}")
    
    # Instrucciones intermedias
    for i in range(1, len(camino_coordenadas) - 1):
        nodo = camino_coordenadas[i]
        
        # Calcular dirección respecto al nodo anterior
        nodo_anterior = camino_coordenadas[i - 1]
        dx = nodo['pos_x'] - nodo_anterior['pos_x']
        dy = nodo['pos_y'] - nodo_anterior['pos_y']
        distancia = (dx**2 + dy**2) ** 0.5
        
        direccion = calcular_direccion(dx, dy)
        
        if nodo['tipo'] == 'edificio':
            instrucciones.append(
                f"Dirígete {direccion} ({distancia:.0f}m) hacia {nodo['nom_nodo']}"
            )
        else:
            instrucciones.append(
                f"Continúa {direccion} ({distancia:.0f}m) por {nodo['nom_nodo']}"
            )
    
    # Última instrucción
    ultimo_nodo = camino_coordenadas[-1]
    penultimo_nodo = camino_coordenadas[-2]
    dx = ultimo_nodo['pos_x'] - penultimo_nodo['pos_x']
    dy = ultimo_nodo['pos_y'] - penultimo_nodo['pos_y']
    distancia = (dx**2 + dy**2) ** 0.5
    direccion = calcular_direccion(dx, dy)
    
    instrucciones.append(
        f"Dirígete {direccion} hasta tu destino: {ultimo_nodo['nom_nodo']}"
    )
    
    return instrucciones


def calcular_direccion(dx, dy):
    """
    Calcula la dirección cardinal basada en el desplazamiento.
    """
    if abs(dx) < 1 and abs(dy) < 1:
        return "en el mismo punto"
    
    angulo = math.degrees(math.atan2(dy, dx))
    
    # Normalizar ángulo a [0, 360)
    if angulo < 0:
        angulo += 360
    
    # Determinar dirección (sistema de coordenadas de pantalla: Y crece hacia abajo)
    if angulo < 22.5 or angulo >= 337.5:
        return "hacia la derecha"
    elif 22.5 <= angulo < 67.5:
        return "diagonal abajo-derecha"
    elif 67.5 <= angulo < 112.5:
        return "hacia abajo"
    elif 112.5 <= angulo < 157.5:
        return "diagonal abajo-izquierda"
    elif 157.5 <= angulo < 202.5:
        return "hacia la izquierda"
    elif 202.5 <= angulo < 247.5:
        return "diagonal arriba-izquierda"
    elif 247.5 <= angulo < 292.5:
        return "hacia arriba"
    else:  # 292.5 <= angulo < 337.5
        return "diagonal arriba-derecha"