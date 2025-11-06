from django.shortcuts import render
from django.http import JsonResponse
from django.db import models
from django.views.decorators.http import require_http_methods
from .models import Ubicacion, Edificio, RelacionU
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
def dijkstra_ruta(request):
    """
    Calcula la ruta óptima usando Dijkstra.
    Parámetros:
        - origen: ID del edificio de origen (requerido)
        - destino: ID del edificio de destino (requerido)
    
    Retorna:
        - camino: Lista de puntos con coordenadas ordenados
        - distancia_total: Distancia total del camino
        - nodos_visitados: Cantidad de nodos en la ruta
    """
    try:
        # Obtener parámetros
        origen_edificio_id = request.GET.get('origen')
        destino_edificio_id = request.GET.get('destino')
        
        if not origen_edificio_id or not destino_edificio_id:
            return JsonResponse({
                'error': 'Se requieren parámetros origen y destino'
            }, status=400)
        
        # Convertir a enteros
        origen_edificio_id = int(origen_edificio_id)
        destino_edificio_id = int(destino_edificio_id)
        
    except (TypeError, ValueError) as e:
        return JsonResponse({
            'error': f'Parámetros inválidos: {str(e)}'
        }, status=400)
    
    # Validar que los edificios existan
    try:
        edificio_origen = Edificio.objects.select_related('ubicacion').get(
            id_edificio=origen_edificio_id
        )
        edificio_destino = Edificio.objects.select_related('ubicacion').get(
            id_edificio=destino_edificio_id
        )
    except Edificio.DoesNotExist:
        return JsonResponse({
            'error': 'Uno o ambos edificios no existen'
        }, status=404)
    
    # Obtener las ubicaciones (nodos) de los edificios
    ubicacion_origen_id = edificio_origen.ubicacion.id_ubicacion
    ubicacion_destino_id = edificio_destino.ubicacion.id_ubicacion
    
    # Validar que no sean el mismo edificio
    if ubicacion_origen_id == ubicacion_destino_id:
        return JsonResponse({
            'error': 'El origen y destino son el mismo edificio'
        }, status=400)
    
    # Construir el grafo
    grafo = construir_grafo()
    
    # Validar que ambos nodos estén en el grafo
    if ubicacion_origen_id not in grafo:
        return JsonResponse({
            'error': f'El edificio de origen "{edificio_origen.nombre}" no tiene conexiones'
        }, status=404)
    
    if ubicacion_destino_id not in grafo:
        return JsonResponse({
            'error': f'El edificio de destino "{edificio_destino.nombre}" no tiene conexiones'
        }, status=404)
    
    # Ejecutar Dijkstra
    camino_ids, distancia_total = ejecutar_dijkstra(
        grafo, 
        ubicacion_origen_id, 
        ubicacion_destino_id
    )
    
    if not camino_ids:
        return JsonResponse({
            'error': f'No existe ruta entre "{edificio_origen.nombre}" y "{edificio_destino.nombre}"'
        }, status=404)
    
    # Obtener las coordenadas de todos los nodos en el camino
    ubicaciones_dict = {
        u.id_ubicacion: u 
        for u in Ubicacion.objects.filter(id_ubicacion__in=camino_ids)
    }
    
    # Construir la respuesta con coordenadas en el orden correcto
    camino_coordenadas = []
    for nodo_id in camino_ids:
        ubicacion = ubicaciones_dict.get(nodo_id)
        if ubicacion:
            camino_coordenadas.append({
                'id': ubicacion.id_ubicacion,
                'nom_nodo': ubicacion.nom_nodo,
                'tipo': ubicacion.tipo,
                'pos_x': float(ubicacion.pos_x),
                'pos_y': float(ubicacion.pos_y)
            })
    
    # Generar instrucciones textuales (opcional)
    instrucciones = generar_instrucciones(camino_coordenadas)
    
    return JsonResponse({
        'success': True,
        'camino': camino_coordenadas,
        'distancia_total': round(distancia_total, 2),
        'nodos_visitados': len(camino_coordenadas),
        'origen': {
            'id': edificio_origen.id_edificio,
            'nombre': edificio_origen.nombre
        },
        'destino': {
            'id': edificio_destino.id_edificio,
            'nombre': edificio_destino.nombre
        },
        'instrucciones': instrucciones
    })


def construir_grafo():
    """
    Construye el grafo completo usando TODAS las relaciones de RelacionU.
    
    IMPORTANTE: Este grafo se basa 100% en la tabla RelacionU.
    Solo incluye conexiones que existen explícitamente en la base de datos.
    
    Reglas:
    - Lee todas las relaciones de la tabla RelacionU
    - Respeta el campo bidireccional
    - Usa peso si existe, sino distancia
    - Edificios NO se conectan directamente (solo a través de intermedios)
    
    Retorna:
        dict: {nodo_id: [(vecino_id, peso), ...]}
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
        # Los edificios DEBEN conectarse a través de puntos intermedios
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
    
    Args:
        grafo: dict con estructura {nodo: [(vecino, peso), ...]}
        origen: ID del nodo de inicio
        destino: ID del nodo objetivo
    
    Returns:
        tuple: (camino_como_lista_de_ids, distancia_total)
               Si no hay camino: ([], float('inf'))
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
    
    Args:
        camino_coordenadas: Lista de diccionarios con pos_x, pos_y, nom_nodo, tipo
    
    Returns:
        list: Lista de strings con instrucciones
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
        f"Dirígete {direccion} ({distancia:.0f}m) hasta tu destino: {ultimo_nodo['nom_nodo']}"
    )
    
    return instrucciones


def calcular_direccion(dx, dy):
    """
    Calcula la dirección cardinal basada en el desplazamiento.
    
    Args:
        dx: Diferencia en X
        dy: Diferencia en Y
    
    Returns:
        str: Dirección (norte, sur, este, oeste, etc.)
    """
    import math
    
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
