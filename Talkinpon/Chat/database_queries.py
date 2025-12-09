# Talkinpon/Chat/database_queries.py

"""
Funciones para consultar la base de datos según los parámetros de DialogFlow
Maneja claves técnicas (SS-01) pero retorna números limpios (1)
"""

from Procesos.models import Procesos, Paso, RequisitoProceso, RequisitoPaso, PasoResponsable
from Ubicaciones.models import Ubicacion, Edificio, Salon
from django.db.models import Q

import re


def extraer_numero_paso(iden):

    '''
    Extrae el número limpio de un iden técnico
    Ejemplos:
        "SS-01" → "1"
        "CC-03" → "3"
        "BT-10" → "10"
    '''

    match = re.search(r'-(\d+)', iden)
    if match:
        numero = match.groAup(1).lstrip('0')
        return numero if numero else '0'
    numeros = re.findall(r'\d+', iden)
    if numeros:
        return numeros[-1].lstrip('0') or '0'
    return iden

def buscar_proceso_completo(nombre_proceso):

    '''
    Busca un proceso por nombre y retorna TODA su información estructurada.
    Retorna números limpios en lugar de claves técnicas
    
    Returns:
        Diccionario completo con proceso, requisitos generales y todos los pasos
    '''

    try:
        # Búsqueda case-insensitive y parcial
        proceso = Procesos.objects.filter(
            Q(nombre__icontains=nombre_proceso)
        ).first()
        
        if not proceso:
            print(f"Proceso no encontrado: {nombre_proceso}")
            return None
        
        print(f"Proceso encontrado: {proceso.nombre}")
        
        # Requisitos generales del proceso
        requisitos_generales = [
            req.descripcion 
            for req in proceso.requisitos.all()
        ]
        
        # Todos los pasos ordenados con su info completa
        pasos_data = []
        pasos = proceso.pasos.all().order_by('id')
        
        for paso in pasos:
            # Extraer número limpio
            numero_limpio = extraer_numero_paso(paso.iden)
            
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
                'numero': numero_limpio,           # Número limpio (1, 2, 3...)
                'iden_tecnico': paso.iden,         # Clave técnica (SS-01, CC-02...)
                'actividad': paso.actividad,
                'tiempo_estimado': paso.tiempo_estimado,
                'responsables': responsables,
                'requisitos_especificos': requisitos_paso
            })
        
        resultado = {
            'proceso': proceso.nombre,
            'descripcion': proceso.descripcion,
            'requisitos_generales': requisitos_generales,
            'pasos': pasos_data,
            'total_pasos': len(pasos_data)
        }
        
        print(f"Info completa del proceso preparada: {len(pasos_data)} pasos")
        return resultado
    
    except Exception as e:
        print(f"Error en buscar_proceso_completo: {e}")
        return None

def listar_todos_procesos(): # Lista todos los procesos disponibles

    try:
        procesos = Procesos.objects.all()
        return [{'nombre': p.nombre, 'descripcion': p.descripcion} for p in procesos]
    except Exception as e:
        print(f"Error en listar_todos_procesos: {e}")
        return []


# ==========================================
# QUERIES DE UBICACIONES (sin cambios)
# ==========================================
def buscar_edificio(nombre_edificio): # Busca información de un edificio

    try:
        edificio = Edificio.objects.filter(
            Q(nombre__icontains=nombre_edificio)
        ).first()
        
        if not edificio:
            print(f"Edificio no encontrado: {nombre_edificio}")
            return None
        
        print(f"Edificio encontrado: {edificio.nombre}")
        
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
            'salones': salones[:5]
        }
    
    except Exception as e:
        print(f"Error en buscar_edificio: {e}")
        return None

def buscar_salon(numero_salon): # Busca un salón específico

    try:
        salon = Salon.objects.filter(numero__icontains=numero_salon).first()
        
        if not salon:
            print(f"Salón no encontrado: {numero_salon}")
            return None
        
        print(f"Salón encontrado: {salon.numero}")
        
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

def listar_todos_edificios(): # Lista todos los edificios disponibles
    
    try:
        edificios = Edificio.objects.all()
        return [{'nombre': e.nombre, 'uso': e.uso} for e in edificios]
    except Exception as e:
        print(f"Error en listar_todos_edificios: {e}")
        return []