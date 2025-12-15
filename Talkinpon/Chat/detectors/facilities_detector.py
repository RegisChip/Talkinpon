'''
Detector de consultas generales sobre instalaciones
Detecta preguntas como "¿dónde hay baños?", "¿dónde hay laboratorios?"
'''
import re

class GeneralFacilitiesDetector:
    """Detecta consultas generales sobre instalaciones en todo el campus"""
    
    def __init__(self):
        # Mapeo de términos a tipos de área en la BD
        self.facility_mapping = {
            # Baños
            'baño': 'baño',
            'baños': 'baño',
            'sanitario': 'baño',
            'sanitarios': 'baño',
            'ir al baño': 'baño',
            'hay baños': 'baño',
            
            # Laboratorios
            'laboratorio': 'laboratorio',
            'laboratorios': 'laboratorio',
            'lab': 'laboratorio',
            'labs': 'laboratorio',
            
            # Cubículos
            'cubiculo': 'cubiculo',
            'cubículo': 'cubiculo',
            'cubiculos': 'cubiculo',
            'cubículos': 'cubiculo',
            
            # Salas
            'sala': 'sala',
            'salas': 'sala',
            'sala de usos multiples': 'sala',
            'sala de juntas': 'sala',
            
            # Cafeterías
            'cafeteria': 'cafeteria',
            'cafetería': 'cafeteria',
            'comedor': 'comedor',
            'donde comer': 'cafeteria',
            'comer': 'cafeteria',
            
            # Almacenes
            'almacen': 'almacen',
            'almacén': 'almacen',
            'bodega': 'almacen',
            
            # Departamentos
            'departamento': 'departamento',
            'departamentos': 'departamento',
            
            # Oficinas
            'oficina': 'oficina',
            'oficinas': 'oficina',
        }
        
        self.general_keywords = [
            'donde hay', 'dónde hay',
            'hay', 'tienen',
            'donde estan', 'dónde están',
            'donde puedo encontrar', 'dónde puedo encontrar',
            'lista de', 'que edificios tienen',
            'en que edificios hay', 'en qué edificios hay',
        ]
    
    def detectar(self, mensaje):
        """
        Detecta si es una consulta general sobre instalaciones
        
        Returns:
            dict con tipo de instalación o None
        """
        msg_lower = mensaje.lower().strip()
        
        # Verificar que sea una pregunta general
        if not any(keyword in msg_lower for keyword in self.general_keywords):
            return None
        
        # Verificar que NO mencione un edificio específico
        if self._menciona_edificio_especifico(msg_lower):
            return None
        
        # Buscar qué instalación está preguntando
        tipo_area = self._identificar_instalacion(msg_lower)
        
        if not tipo_area:
            return None
        
        return {
            'es_consulta_general': True,
            'tipo_instalacion': tipo_area,
            'mensaje_original': mensaje
        }
    
    def _menciona_edificio_especifico(self, texto):
        """Verifica si menciona un edificio específico"""
        # Patrones que indican edificio específico
        patterns = [
            r'\bedificio\s+[a-z]\b',
            r'\bel\s+[a-z]\b',
            r'\ben\s+el\s+[a-z]\b',
            r'\bdel\s+[a-z]\b',
        ]
        
        for pattern in patterns:
            if re.search(pattern, texto):
                return True
        
        return False
    
    def _identificar_instalacion(self, texto):
        """Identifica qué tipo de instalación está buscando"""
        for keyword, tipo_area in self.facility_mapping.items():
            if keyword in texto:
                return tipo_area
        
        return None