# Talkinpon/Chat/detectors/route_detector.py

"""
Detector de solicitudes de rutas entre edificios
"""

import re
from ..constants import KEYWORDS_RUTA
from ..helpers import validar_edificios

class RouteDetector:
    """Detecta solicitudes de rutas entre edificios"""
    
    def __init__(self):
        self.keywords = KEYWORDS_RUTA
        self.patrones = self._inicializar_patrones()
    
    def _inicializar_patrones(self):
        """Define los patrones de detección en orden de especificidad"""
        return [
            # Patrón 1: "estoy en X ... como llego ... Y"
            {
                'regex': r'estoy\s+en\s+(?:el\s+)?(?:edificio\s+)?([a-z]+).*?(?:como|cómo)\s+(?:llego|voy)\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+)',
                'grupos': ('origen', 'destino')
            },
            # Patrón 2: "como llego ... Y ... desde X"
            {
                'regex': r'(?:como|cómo)\s+(?:llego|voy)\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+).*?(?:desde|de)\s+(?:el\s+)?(?:edificio\s+)?([a-z]+)',
                'grupos': ('destino', 'origen')
            },
            # Patrón 3: "como llego ... Y ... si estoy en X"
            {
                'regex': r'(?:como|cómo)\s+(?:llego|voy)\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+).*?si\s+estoy\s+en\s+(?:el\s+)?(?:edificio\s+)?([a-z]+)',
                'grupos': ('destino', 'origen')
            },
            # Patrón 4: "ruta del X al Y" o "del X al Y"
            {
                'regex': r'(?:ruta\s+)?del?\s+(?:edificio\s+)?([a-z]+)\s+al?\s+(?:edificio\s+)?([a-z]+)',
                'grupos': ('origen', 'destino')
            },
            # Patrón 5: "como llego al Y" (solo destino)
            {
                'regex': r'(?:como|cómo)\s+(?:llego|voy)\s+(?:al?|del?)\s+(?:edificio\s+)?([a-z]+)',
                'grupos': ('destino',),
                'origen_default': 'A'
            },
            # Patrón 6: "donde está X" (solo destino)
            {
                'regex': r'(?:donde|dónde)\s+(?:esta|está|queda)\s+(?:el\s+)?(?:edificio\s+)?([a-z]+)',
                'grupos': ('destino',),
                'origen_default': 'A'
            },
        ]
    
    def detectar(self, mensaje):
        """
        Detecta si el mensaje es una solicitud de ruta
        
        Returns:
            dict con origen y destino o None
        """
        msg_lower = mensaje.lower().strip()
        
        # Verificar keywords
        if not any(keyword in msg_lower for keyword in self.keywords):
            return None
        
        # Probar cada patrón en orden
        for patron in self.patrones:
            resultado = self._probar_patron(msg_lower, patron, mensaje)
            if resultado:
                return resultado
        
        print(f"No se detectó patrón de ruta en: {mensaje}")
        return None
    
    def _probar_patron(self, texto, patron, mensaje_original):
        """Prueba un patrón específico"""
        match = re.search(patron['regex'], texto)
        
        if not match:
            return None
        
        # Extraer origen y destino según los grupos
        grupos = patron['grupos']
        valores = {}
        
        for i, nombre_grupo in enumerate(grupos, 1):
            valores[nombre_grupo] = match.group(i).upper()
        
        # Aplicar origen por defecto si es necesario
        if 'origen' not in valores and 'origen_default' in patron:
            valores['origen'] = patron['origen_default']
        
        # Validar que tengamos origen y destino
        if 'origen' not in valores or 'destino' not in valores:
            return None
        
        origen = valores['origen']
        destino = valores['destino']
        
        # Validar que existan en BD
        if not validar_edificios(origen, destino):
            return None
        
        print(f"✓ Ruta detectada: {origen} → {destino}")
        
        return {
            'es_ruta': True,
            'origen': origen,
            'destino': destino,
            'mensaje_original': mensaje_original
        }