# Talkinpon\Talkinpon\Chat\crear_embeddings.py

"""
Script para crear embeddings de los procesos
Se ejecutar UNA VEZ cuando se cambia la info de procesos
"""

import json
import sys
import os
import numpy as np
import django
import re

from sentence_transformers import SentenceTransformer
from pathlib import Path

# Se agrega el path del proyecto
sys.path.append(str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'talkinpon.settings')

django.setup()

from Procesos.models import Procesos, Paso
from Chat.database_queries import buscar_proceso_completo

# Modelo de embeddings (ligero y en español)
# Se descarga automáticamente la primera vez
MODEL = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

def extraer_numero_paso(iden):

    '''
    Extrae el número limpio de un iden técnico
    Ejemplos:
        "SS-01" → "1"
        "CC-03" → "3"
        "BT-10" → "10"

    Args:
        iden: Identificador técnico del paso (ej: "SS-01")
    Returns:
        String con el número limpio (ej: "1")
    '''

    # Extraer dígitos después del guión
    match = re.search(r'-(\d+)', iden)
    if match:
        numero = match.group(1).lstrip('0')  # Remover ceros a la izquierda
        return numero if numero else '0'
    # Si no tiene formato esperado, intentar extraer cualquier número
    numeros = re.findall(r'\d+', iden)
    if numeros:
        return numeros[-1].lstrip('0') or '0'
    # Fallback: retornar el iden original
    return iden

def crear_chunks_proceso(proceso_data):

    '''
    Divide un proceso en chunks pequeños y semánticos
    Cada chunk es una unidad de info que puede responder 1 pregunta
    '''

    chunks = []
    proceso_nombre = proceso_data['proceso']

    # Chunk 1: Info general del proceso
    chunk_general = {
        'tipo': 'general',
        'proceso': proceso_nombre,
        'texto': f"Proceso: {proceso_nombre}. {proceso_data['descripcion']}. "
                 f"Total de pasos: {proceso_data['total_pasos']}.",
        'metadata': {
            'proceso': proceso_nombre,
            'descripcion': proceso_data['descripcion'],
            'total_pasos': proceso_data['total_pasos']
        }
    }
    chunks.append(chunk_general)

    # Chunk 2: Requisitos generales
    if proceso_data.get('requisitos_generales'):
        req_text = f"Requisitos generales para {proceso_nombre}: " + \
                   ", ".join(proceso_data['requisitos_generales'])
        chunk_req = {
            'tipo': 'requisitos_generales',
            'proceso': proceso_nombre,
            'texto': req_text,
            'metadata': {
                'proceso': proceso_nombre,
                'requisitos': proceso_data['requisitos_generales']
            }
        }
        chunks.append(chunk_req)

    # Chunk por cada paso (lo más importante)
    for paso in proceso_data['pasos']:
        # Extraer número limpio del iden (ej: "SS-01" → "1")
        numero_limpio = extraer_numero_paso(paso['numero'])
        
        paso_text = f"Proceso {proceso_nombre}, Paso {numero_limpio}: {paso['actividad']}. " \
                    f"Tiempo estimado: {paso['tiempo_estimado']}. " \
                    f"Responsable(s): {', '.join(paso['responsables'])}."
        
        if paso.get('requisitos_especificos'):
            paso_text += f" Requisitos específicos: {', '.join(paso['requisitos_especificos'])}."
        
        chunk_paso = {
            'tipo': 'paso',
            'proceso': proceso_nombre,
            'numero_paso': numero_limpio,  # Número limpio (1, 2, 3...)
            'iden_tecnico': paso['numero'],  # Clave técnica (SS-01, CC-02...)
            'texto': paso_text,
            'metadata': {
                **paso,
                'numero_limpio': numero_limpio
            }
        }
        chunks.append(chunk_paso)
    return chunks

def generar_embeddings():

    '''
    Genera embeddings de TODOS los procesos y los guarda
    '''

    print("Generando embeddings de procesos...")
    # Obtener todos los procesos
    procesos = Procesos.objects.all()
    todos_chunks = []

    for proceso in procesos:
        print(f"Procesando: {proceso.nombre}")
        # Obtener info completa del proceso
        proceso_data = buscar_proceso_completo(proceso.nombre)
        if not proceso_data:
            print(f"    No se pudo obtener data de {proceso.nombre}")
            continue
        # Crear chunks
        chunks = crear_chunks_proceso(proceso_data)
        todos_chunks.extend(chunks)
        print(f"    {len(chunks)} chunks creados")

    # Generar embeddings
    print(f"\n Total de chunks: {len(todos_chunks)}")
    print(" - Generando vectores...")

    textos = [chunk['texto'] for chunk in todos_chunks]
    embeddings = MODEL.encode(textos, show_progress_bar=True)
    # Guardar
    output_dir = Path(__file__).parent / 'embeddings_data'
    output_dir.mkdir(exist_ok=True)
    # Guardar chunks
    with open(output_dir / 'chunks.json', 'w', encoding='utf-8') as f:
        json.dump(todos_chunks, f, ensure_ascii=False, indent=2)
    
    # Guardar embeddings
    np.save(output_dir / 'embeddings.npy', embeddings)
    
    print(f"\n Embeddings guardados en: {output_dir}")
    print(f"   - chunks.json ({len(todos_chunks)} chunks)")
    print(f"   - embeddings.npy ({embeddings.shape})")

if __name__ == "__main__":
    generar_embeddings()