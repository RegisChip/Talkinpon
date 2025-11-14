# Talkinpon\Talkinpon\Chat\database_queries.py

"""
Funciones para consultar la base de datos según los parámetros de DialogFlow
"""
from Procesos.models import Procesos, Paso, RequisitoProceso, RequisitoPaso, PasoResponsable
from Ubicaciones.models import Ubicacion, Edificio, Salon
from django.db.models import Q

def buscar_proceso(nombre_proceso):
    """
    Busca un proceso por nombre (búsqueda flexible)
    Retorna un diccionario con toda la información estructurada
    """
    try:
        # Búsqueda case-insensitive y parcial
        proceso = Procesos.objects.filter(
            Q(nombre__icontains=nombre_proceso)
        ).first()
        
        if not proceso:
            return None
        
        # Obtener requisitos generales
        requisitos_generales = [
            req.descripcion 
            for req in proceso.requisitos.all()
        ]
        
        # Obtener todos los pasos ordenados
        pasos_data = []
        pasos = proceso.pasos.all().order_by('id')
        
        for paso in pasos:
            # Requisitos específicos del paso
            requisitos_paso = [
                req.descripcion 
                for req in paso.requisitos.all()
            ]
            
            # Responsables del paso
            responsables = [
                pr.entidad.nombre 
                for pr in paso.responsables.all()
            ]
            
            pasos_data.append({
                'numero': paso.iden,
                'actividad': paso.actividad,
                'tiempo_estimado': paso.tiempo_estimado,
                'responsables': responsables,
                'requisitos_especificos': requisitos_paso
            })
        
        return {
            'proceso': proceso.nombre,
            'descripcion': proceso.descripcion,
            'requisitos_generales': requisitos_generales,
            'pasos': pasos_data,
            'total_pasos': len(pasos_data)
        }
    
    except Exception as e:
        print(f"Error en buscar_proceso: {e}")
        return None


def buscar_paso_especifico(identificador_paso):
    """
    Busca un paso específico por su identificador (ej: SS-01, SS-02)
    """
    try:
        paso = Paso.objects.filter(iden__iexact=identificador_paso).first()
        
        if not paso:
            return None
        
        # Requisitos específicos del paso
        requisitos_paso = [
            req.descripcion 
            for req in paso.requisitos.all()
        ]
        
        # Responsables del paso
        responsables = [
            pr.entidad.nombre 
            for pr in paso.responsables.all()
        ]
        
        return {
            'proceso': paso.proceso.nombre,
            'numero': paso.iden,
            'actividad': paso.actividad,
            'tiempo_estimado': paso.tiempo_estimado,
            'responsables': responsables,
            'requisitos_especificos': requisitos_paso
        }
    
    except Exception as e:
        print(f"Error en buscar_paso_especifico: {e}")
        return None


def buscar_edificio(nombre_edificio):
    """
    Busca información de un edificio
    """
    try:
        edificio = Edificio.objects.filter(
            Q(nombre__icontains=nombre_edificio)
        ).first()
        
        if not edificio:
            return None
        
        # Obtener salones del edificio
        salones = []
        for salon in edificio.salones.all():
            salones.append({
                'numero': salon.numero,
                'piso': salon.piso,
                'capacidad': salon.capacidad
            })
        
        return {
            'nombre': edificio.nombre,
            'uso': edificio.uso,
            'num_salones': edificio.num_salones,
            'ubicacion': {
                'nodo': edificio.ubicacion.nombre_nodo,
                'pos_x': edificio.ubicacion.pos_x,
                'pos_y': edificio.ubicacion.pos_y
            },
            'salones': salones
        }
    
    except Exception as e:
        print(f"Error en buscar_edificio: {e}")
        return None


def buscar_salon(numero_salon):
    """
    Busca un salón específico
    """
    try:
        salon = Salon.objects.filter(numero__icontains=numero_salon).first()
        
        if not salon:
            return None
        
        return {
            'numero': salon.numero,
            'piso': salon.piso,
            'capacidad': salon.capacidad,
            'edificio': salon.edificio.nombre,
            'ubicacion': {
                'nodo': salon.edificio.ubicacion.nombre_nodo,
                'pos_x': salon.edificio.ubicacion.pos_x,
                'pos_y': salon.edificio.ubicacion.pos_y
            }
        }
    
    except Exception as e:
        print(f"Error en buscar_salon: {e}")
        return None


def listar_todos_procesos():
    """
    Lista todos los procesos disponibles (para cuando el usuario pregunta qué procesos hay)
    """
    try:
        procesos = Procesos.objects.all()
        return [{'nombre': p.nombre, 'descripcion': p.descripcion} for p in procesos]
    except Exception as e:
        print(f"Error en listar_todos_procesos: {e}")
        return []


def listar_todos_edificios():
    """
    Lista todos los edificios disponibles
    """
    try:
        edificios = Edificio.objects.all()
        return [{'nombre': e.nombre, 'uso': e.uso} for e in edificios]
    except Exception as e:
        print(f"Error en listar_todos_edificios: {e}")
        return []