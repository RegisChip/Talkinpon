'''
Detector de consultas sobre edificios - ACTUALIZADO
Detecta laboratorios específicos (ej: LC3, LC 3)
'''
import re
from ..constants import KEYWORDS_EDIFICIO
from ..helpers import extraer_edificio_de_texto, extraer_numero_salon

class BuildingDetector:
    """Detecta consultas sobre edificios y sus componentes"""
    
    def __init__(self):
        self.keywords = KEYWORDS_EDIFICIO
    
    def detectar(self, mensaje):
        """
        Detecta si el mensaje pregunta sobre edificios
        
        Returns:
            dict con tipo de consulta o None
        """
        msg_lower = mensaje.lower().strip()
        
        # PRIORIDAD 1: Laboratorio específico (ej: "donde está el LC3")
        lab_info = self._detectar_laboratorio_especifico(msg_lower)
        if lab_info:
            return {
                'es_consulta_edificio': True,
                'tipo': 'laboratorio_especifico',
                'laboratorio_nombre': lab_info,
                'mensaje_original': mensaje
            }
        
        # Verificar keywords
        if not any(keyword in msg_lower for keyword in self.keywords):
            return None
        
        # PRIORIDAD 2: Salón específico
        salon_numero = extraer_numero_salon(msg_lower)
        if salon_numero:
            return {
                'es_consulta_edificio': True,
                'tipo': 'salon_especifico',
                'salon_numero': salon_numero,
                'mensaje_original': mensaje
            }
        
        # PRIORIDAD 3: Edificio mencionado
        edificio_nombre = extraer_edificio_de_texto(mensaje)
        if not edificio_nombre:
            return None
        
        # Determinar tipo de consulta
        tipo = self._determinar_tipo_consulta(msg_lower)
        
        return {
            'es_consulta_edificio': True,
            'tipo': tipo,
            'edificio_nombre': edificio_nombre,
            'mensaje_original': mensaje
        }
    
    def _detectar_laboratorio_especifico(self, texto):
        """
        Detecta si menciona un laboratorio específico
        Ejemplos: LC3, LC 3, LC1, laboratorio LC3, laboratorio LC 1
        
        Returns:
            String con nombre del laboratorio o None
        """
        # Patrón para LC seguido de número (con o sin espacio)
        patterns = [
            r'\bLC\s*(\d+)\b',                    # LC3, LC 3, LC1
            r'\bL\.C\.\s*(\d+)\b',                # L.C.3, L.C. 3
            r'\blaboratorio\s+LC\s*(\d+)\b',      # laboratorio LC3
            r'\bel\s+LC\s*(\d+)\b',               # el LC3
        ]
        
        for pattern in patterns:
            match = re.search(pattern, texto, re.IGNORECASE)
            if match:
                numero = match.group(1)
                # Normalizar: siempre con espacio
                return f"LC {numero}"
        
        # Patrón para otros laboratorios con nombre
        match = re.search(r'\blaboratorio\s+([A-Z]+-?\d+)\b', texto, re.IGNORECASE)
        if match:
            return match.group(1).upper()
        
        return None
    
    def _determinar_tipo_consulta(self, texto):
        """Determina el tipo específico de consulta sobre el edificio"""
        
        # Uso y función
        if any(kw in texto for kw in [
            'para que sirve', 'para qué sirve', 'uso', 'funcion', 'función'
        ]):
            return 'uso_edificio'
        
        # Baños
        if any(kw in texto for kw in [
            'baño', 'baños', 'sanitario', 'sanitarios'
        ]):
            return 'baños'
        
        # Salones
        if any(kw in texto for kw in ['salon', 'salón', 'salones', 'aula', 'aulas']):
            return 'salones_edificio'
        
        # Laboratorios (general)
        if any(kw in texto for kw in ['laboratorio', 'laboratorios', 'lab ']):
            return 'laboratorios'
        
        # Contenido general
        if any(kw in texto for kw in [
            'que tiene', 'qué tiene', 'que hay', 'instalaciones'
        ]):
            return 'contenido_general'
        
        # Por defecto
        return 'info_general'