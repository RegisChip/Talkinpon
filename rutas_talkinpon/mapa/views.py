from django.shortcuts import render
from django.http import JsonResponse
from .models import Ubicacion, Edificio, RelacionU
import json

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
