# Talkinpon\Talkinpon\Chat\detectors\department_detector.py

'''
Detector de consultas sobre departamentos del Edificio A
'''

import re
from ..constants import DEPARTAMENTOS_EDIFICIO_A, KEYWORDS_UBICACION

class DepartmentDetector: # Detecta consultas sobre departamentos administrativos

    def __init__(self):
        self.departamentos = DEPARTAMENTOS_EDIFICIO_A
        self.keywords = KEYWORDS_UBICACION

    def detectar(self, mensaje):

        '''
        Detecta si el mensaje pregunta sobre ubicación de departamentos
        
        Returns:
            dict con info de departamento o None
        '''

        msg_lower = mensaje.lower().strip()

        # Verificar keywords de ubicación
        if not any(keyword in msg_lower for keyword in self.keywords):
            return None
        
        # Buscar departamento mencionado
        departamento_info = self._buscar_departamento(msg_lower)
        if not departamento_info:
            return None
        
        # Detectar edificio de origen si lo menciona
        origen_edificio = self._extraer_origen(msg_lower)

        return {
            'es_departamento': True,
            'departamento': departamento_info['nombre_oficial'],
            'origen_edificio': origen_edificio,
            'mensaje_original': mensaje
        }
    
    def _buscar_departamento(self, texto): # Busca si el texto menciona algún departamento
        for keyword, nombre_oficial in self.departamentos.items():
            if keyword in texto:
                return {
                    'keyword': keyword,
                    'nombre_oficial': nombre_oficial
                }
        return None
    
    def _extraer_origen(self, texto): # Extrae el edificio de origen si lo menciona
        match = re.search(
            r'(?:desde|estoy\s+en|vengo\s+del?)\s+(?:el\s+)?(?:edificio\s+)?([a-z])\b',
            texto
        )
        if match:
            return match.group(1).upper()
        return None