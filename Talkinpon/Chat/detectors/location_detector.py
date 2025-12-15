'''
Detector universal de ubicaciones específicas
Identifica CUALQUIER área/departamento/laboratorio/sala del campus
'''
import re
from fuzzywuzzy import fuzz

class UniversalLocationDetector:
    """
    Detector universal que identifica cualquier lugar específico del campus
    Ejemplos: "Centro de Lenguas", "Sala Memorial", "Laboratorio de Física"
    """
    
    def __init__(self):
        self.keywords_ubicacion = [
            'donde esta', 'dónde está', 'donde está',
            'donde queda', 'dónde queda',
            'donde se encuentra', 'dónde se encuentra',
            'ubicacion de', 'ubicación de',
            'en donde', 'en dónde',
            'como llego a', 'cómo llego a',
            'busco', 'encontrar',
            'ir a', 'voy a',
            'llevame a', 'llévame a',
            'esta la', 'está la', 'esta el', 'está el',
            'queda la', 'queda el',
        ]
        
        # Palabras que NO son lugares (para evitar falsos positivos)
        self.palabras_excluir = [
            'como', 'cómo', 'cuando', 'cuándo', 'que', 'qué',
            'por', 'para', 'con', 'sin', 'muy', 'mas', 'más'
        ]
    
    def detectar(self, mensaje):
        """
        Detecta si el mensaje pregunta por un lugar específico
        
        Returns:
            dict con info de la consulta o None
        """
        msg_lower = mensaje.lower().strip()
        
        # Verificar keywords de ubicación
        tiene_keyword = any(kw in msg_lower for kw in self.keywords_ubicacion)
        
        if not tiene_keyword:
            return None
        
        # Verificar que NO sea consulta de edificio genérico
        if self._es_consulta_edificio_generico(msg_lower):
            return None
        
        # Extraer el nombre del lugar que busca
        nombre_lugar = self._extraer_nombre_lugar(mensaje, msg_lower)
        
        if not nombre_lugar:
            return None
        
        # Limpiar nombre
        nombre_limpio = self._limpiar_nombre(nombre_lugar)
        
        if not nombre_limpio or len(nombre_limpio) < 3:
            return None
        
        return {
            'es_ubicacion_especifica': True,
            'nombre_buscado': nombre_limpio,
            'mensaje_original': mensaje
        }
    
    def _es_consulta_edificio_generico(self, texto):
        """Verifica si solo pregunta por edificio (sin lugar específico)"""
        patterns = [
            r'\bedificio\s+[a-z]\s*$',  # "edificio A"
            r'\bel\s+[a-z]\s*$',        # "el A"
            r'^\s*[a-z]\s*$',           # solo "A"
        ]
        
        for pattern in patterns:
            if re.search(pattern, texto):
                return True
        
        return False
    
    def _extraer_nombre_lugar(self, mensaje_original, msg_lower):
        """
        Extrae el nombre del lugar que el usuario está buscando
        Inteligentemente detecta después de keywords
        """
        
        # Patrones ordenados por prioridad
        patterns = [
            # "donde está el/la/los/las [LUGAR]"
            r'(?:donde|dónde)\s+(?:está|esta|queda)\s+(?:el|la|los|las)\s+(.+?)(?:\?|$)',
            
            # "donde está [LUGAR]"
            r'(?:donde|dónde)\s+(?:está|esta|queda)\s+(.+?)(?:\?|$)',
            
            # "ubicación de/del/de la [LUGAR]"
            r'ubicaci[oó]n\s+(?:de|del|de\s+la)\s+(.+?)(?:\?|$)',
            
            # "cómo llego a/al/a la [LUGAR]"
            r'c[oó]mo\s+llego\s+(?:a|al|a\s+la)\s+(.+?)(?:\?|$)',
            
            # "busco/quiero ir a [LUGAR]"
            r'(?:busco|quiero\s+ir)\s+(?:a|al|a\s+la)?\s*(.+?)(?:\?|$)',
            
            # "llevame a/al [LUGAR]"
            r'll[eé]vame\s+(?:a|al|a\s+la)\s+(.+?)(?:\?|$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, msg_lower)
            if match:
                lugar_extraido = match.group(1).strip()
                
                # Limpiar sufijos comunes
                lugar_extraido = re.sub(r'\s+(por\s+favor|gracias)$', '', lugar_extraido)
                
                return lugar_extraido
        
        return None
    
    def _limpiar_nombre(self, nombre):
        """Limpia y normaliza el nombre del lugar"""
        # Remover artículos al inicio
        nombre = re.sub(r'^(el|la|los|las|un|una)\s+', '', nombre, flags=re.IGNORECASE)
        
        # Remover palabras de relleno
        palabras = nombre.split()
        palabras_filtradas = [
            p for p in palabras 
            if p.lower() not in self.palabras_excluir
        ]
        
        return ' '.join(palabras_filtradas).strip()