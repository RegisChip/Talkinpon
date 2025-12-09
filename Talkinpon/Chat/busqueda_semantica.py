# Talkinpon\Talkinpon\Chat\busqueda_semantica.py

"""
Sistema de busqueda semantica:
Tratando de cubrir todos los casos posibles
de uso del usuario
"""

import json
import numpy as np
import re

from sentence_transformers import SentenceTransformer
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity

class BuscadorSemantico: # Inicializa el buscador cargando embeddings
    def __init__(self):

        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        self.embeddings_dir = Path(__file__).parent / 'embeddings_data'

        # Carga los chunks y embeddings
        with open(self.embeddings_dir / 'chunks.json', 'r', encoding='utf-8') as f:
            self.chunks = json.load(f)

        self.embeddings = np.load(self.embeddings_dir / 'embeddings.npy')
        print(f"Buscador Semantico listo: {len(self.chunks)} chunks")

    def buscar(self, pregunta, top_k=3, proceso_especifico=None, filtro_tipo=None):

        '''
        Busca los chunks más relevantes para una pregunta

        Args:
            pregunta: Texto de la pregunta del usuario
            top_k: Número de resultados a retornar
            proceso_especifico: Si se especifica, filtra por ese proceso
            filtro_tipo: Filtrar por tipo de chunk ('paso', 'general', 'requisitos_generales')
        Returns:
            Lista de chunks relevantes con su score
        '''

        # Genera el embeddings de la pregunta
        query_embedding = self.model.encode([pregunta])[0]
        # Calcula las similitudes
        similitudes = cosine_similarity(
            [query_embedding],
            self.embeddings
        )[0]
        # Filtrar por proceso si es que se especifica
        indices_validos = []
        for i, chunk in enumerate(self.chunks):
            # Filtrar por proceso
            if proceso_especifico and chunk['proceso'].lower() != proceso_especifico.lower():
                continue
            # Filtrar por tipo
            if filtro_tipo and chunk['tipo'] != filtro_tipo:
                continue

            indices_validos.append(i)

        # Obtiene top_k
        scores_filtrados = [(i, similitudes[i]) for i in indices_validos]
        scores_filtrados.sort(key=lambda x: x[1], reverse=True)
        top_indices = scores_filtrados[:top_k]

        # Preparando los resultados 
        resultados = []
        for idx, score in top_indices:
            chunk = self.chunks[idx].copy()
            chunk['relevancia'] = float(score)
            resultados.append(chunk)

        return resultados
    
    def buscar_paso_especifico(self, proceso, numero_paso):

        '''
        Busca un paso específico de un proceso
        
        Args:
            proceso: Nombre del proceso
            numero_paso: Número del paso (puede ser int o string)
        Returns:
            Chunk del paso específico o None
        '''

        numero_paso_str = str(numero_paso).strip()

        for chunk in self.chunks:
            if (chunk['tipo'] == 'paso' and chunk['proceso'].lower() == proceso.lower()):
                # Compara el numero del paso (puede ser "1", "1.1", "Paso 1", etc.)
                numero_chunk = str(chunk.get('numero_paso', '')).strip()
                # Coincidencia exacta o inicio
                if numero_chunk == numero_paso_str or numero_chunk.startswith(numero_paso_str):
                    return chunk
        return None
    
    def buscar_paso_por_actividad(self, proceso, descripcion_actividad):

        '''
        Busca un paso por descripción de su actividad
        (Ej:"ya hice la solicitud, ¿qué sigue?")
        
        Args:
            proceso: Nombre del proceso
            descripcion_actividad: Descripción de la actividad realizada
        Returns:
            Chunk del paso que coincide con esa actividad
        '''

        # Se genera el embedding de la descripción
        query_embedding = self.model.encode([descripcion_actividad])[0]
        # Buscar solo en pasos de ese proceso
        pasos_proceso = [(i, chunk) for i, chunk in enumerate(self.chunks) if chunk['tipo'] == 'paso' and chunk['proceso'].lower() == proceso.lower()]

        if not pasos_proceso:
            return None
        
        # Calcular similitudes solo con esos pasos
        indices_pasos = [i for i, _ in pasos_proceso]
        embeddings_pasos = self.embeddings[indices_pasos]

        similitudes = cosine_similarity([query_embedding], embeddings_pasos)[0]

        # Obtener el más similar
        idx_mas_similar = np.argmax(similitudes)
        score = similitudes[idx_mas_similar]
        
        # Solo retornar si la similitud es alta (>0.6)
        if score > 0.6:
            chunk_original_idx = indices_pasos[idx_mas_similar]
            chunk = self.chunks[chunk_original_idx].copy()
            chunk['relevancia'] = float(score)
            return chunk
        
        return None
    
    def obtener_siguiente_paso(self, proceso, paso_actual):
        
        '''
        Obtiene el paso siguiente a uno dado
        
        Args:
            proceso: Nombre del proceso
            paso_actual: Número del paso actual (puede ser int, string, o chunk)
        Returns:
            Chunk del siguiente paso o None
        '''

        # Si paso_actual es un chunk, extraer su número
        if isinstance(paso_actual, dict):
            paso_actual = paso_actual.get('numero_paso', '')
        
        numero_actual = str(paso_actual).strip()
        # Obtener todos los pasos del proceso ordenados
        pasos = [chunk for chunk in self.chunks if chunk['tipo'] == 'paso' and chunk['proceso'].lower() == proceso.lower()]
        
        # Ordenar por número de paso (asumiendo formato numérico)
        try:
            pasos.sort(key=lambda x: float(re.sub(r'[^\d.]', '', str(x.get('numero_paso', '0')))))
        except:
            # Si falla el sorting, mantener orden original
            pass
        
        # Buscar paso actual y retornar el siguiente
        for i, paso in enumerate(pasos):
            numero_paso = str(paso.get('numero_paso', '')).strip()
            
            if numero_paso == numero_actual:
                # Retornar siguiente si existe
                if i + 1 < len(pasos):
                    return pasos[i + 1]
                else:
                    return None  # Ya es el último paso
        
        return None
    
    def obtener_info_general(self, proceso):

        '''
        Obtiene la info general de un proceso (descripción, requisitos generales)
        
        Args:
            proceso: Nombre del proceso
        Returns:
            Lista con chunks de info general
        '''

        chunks_generales = []
        for chunk in self.chunks:
            if (chunk['proceso'].lower() == proceso.lower() and 
                chunk['tipo'] in ['general', 'requisitos_generales']):
                chunks_generales.append(chunk)
        
        return chunks_generales
    
    def obtener_todos_pasos(self, proceso, max_pasos=None):

        '''
        Obtiene TODOS los pasos de un proceso
        (Ej:"¿cómo se hace el servicio social?")
        
        Args:
            proceso: Nombre del proceso
            max_pasos: Límite de pasos (None = todos)
        
        Returns:
            Lista de chunks de pasos ordenados
        '''

        pasos = [chunk for chunk in self.chunks if chunk['tipo'] == 'paso' and chunk['proceso'].lower() == proceso.lower()]
        
        # Ordenar por número de paso
        try:
            pasos.sort(key=lambda x: float(re.sub(r'[^\d.]', '', str(x.get('numero_paso', '0')))))
        except:
            pass
        if max_pasos:
            pasos = pasos[:max_pasos]
        
        return pasos
    
    def buscar_requisitos(self, proceso, tipo='generales'):

        '''
        Busca requisitos de un proceso
        AC
        Args:
            proceso: Nombre del proceso
            tipo: 'generales' o 'especificos'
        Returns:
            Lista con chunks de requisitos
        '''

        if tipo == 'generales':
            return [
                chunk for chunk in self.chunks
                if chunk['proceso'].lower() == proceso.lower() and
                   chunk['tipo'] == 'requisitos_generales'
            ]
        else:
            # Requisitos específicos están dentro de los pasos
            pasos = [
                chunk for chunk in self.chunks
                if chunk['tipo'] == 'paso' and 
                   chunk['proceso'].lower() == proceso.lower() and
                   chunk.get('metadata', {}).get('requisitos_especificos')
            ]
            return pasos

_buscador_instancia = None

def obtener_buscador():
    """Retorna la instancia singleton del buscador"""
    global _buscador_instancia
    
    if _buscador_instancia is None:
        _buscador_instancia = BuscadorSemantico()
    
    return _buscador_instancia