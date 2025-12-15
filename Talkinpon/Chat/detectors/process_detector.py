# Talkinpon/Chat/detectors/process_detector.py

"""
Detector y clasificador de consultas sobre procesos administrativos
"""

import re
from ..constants import MAPEO_PROCESOS, DESPEDIDAS
from ..helpers import normalizar_proceso

class ProcessDetector:
    """Detecta y clasifica consultas sobre procesos administrativos"""
    
    def __init__(self):
        self.mapeo_procesos = MAPEO_PROCESOS
        self.despedidas = DESPEDIDAS
    
    def clasificar_intencion(self, mensaje):
        """
        Clasifica la intención del mensaje
        
        Returns:
            dict con 'tipo', 'proceso', y otros datos relevantes
        """
        msg_lower = mensaje.lower().strip()
        
        # CRÍTICO: Detectar respuestas negativas/cortas sin sentido
        if self._es_ruido(msg_lower):
            return {'tipo': 'general'}
        
        # Detectar saludos
        if self._es_saludo(msg_lower):
            return {'tipo': 'saludo'}
        
        # Detectar despedidas
        if self._es_despedida(msg_lower):
            return {'tipo': 'despedida'}
        
        # Detectar proceso mencionado
        proceso = normalizar_proceso(mensaje, self.mapeo_procesos)
        
        # Detectar paso específico
        match_paso = re.search(r'paso\s+(\d+\.?\d*)', msg_lower)
        if match_paso:
            return {
                'tipo': 'paso_especifico',
                'proceso': proceso,
                'numero_paso': match_paso.group(1)
            }
        
        # Continuación natural ("ya hice X")
        if any(palabra in msg_lower for palabra in [
            'ya hice', 'ya termine', 'ya complete', 'acabo de'
        ]):
            actividad = self._extraer_actividad_realizada(msg_lower)
            return {
                'tipo': 'continuacion_natural',
                'proceso': proceso,
                'actividad_realizada': actividad
            }
        
        # Siguiente paso
        if any(palabra in msg_lower for palabra in [
            'siguiente', 'despues', 'después', 'qué sigue', 'continua', 'continúa'
        ]):
            return {'tipo': 'siguiente_paso', 'proceso': proceso}
        
        # Tiempo/duración
        if any(palabra in msg_lower for palabra in [
            'cuanto tarda', 'cuánto tarda', 'duracion', 'duración', 'tiempo'
        ]):
            return {'tipo': 'tiempo', 'proceso': proceso}
        
        # Responsable
        if any(palabra in msg_lower for palabra in [
            'quien', 'quién', 'responsable', 'encargado', 'donde lo hago', 'dónde'
        ]):
            return {'tipo': 'responsable', 'proceso': proceso}
        
        # Requisitos
        if any(palabra in msg_lower for palabra in [
            'requisito', 'necesito', 'requiere', 'documento', 'que ocupo', 'qué ocupo'
        ]):
            return {'tipo': 'requisitos', 'proceso': proceso}
        
        # Proceso completo
        if any(palabra in msg_lower for palabra in [
            'como se hace', 'cómo se hace', 'como hago', 'cómo hago',
            'procedimiento', 'pasos'
        ]):
            return {'tipo': 'proceso_completo', 'proceso': proceso}
        
        # Info general del proceso
        if proceso:
            return {'tipo': 'info_proceso', 'proceso': proceso}
        
        # General (sin clasificar)
        return {'tipo': 'general'}
    
    def _es_ruido(self, texto):
        """Detecta respuestas cortas sin sentido que no deben procesarse"""
        # Palabras que solas no tienen sentido de consulta
        ruido = ['no', 'si', 'sí', 'ok', 'a', 'ah', 'oh', 'um', 'eh']
        
        # Si es muy corto (1-2 caracteres) y no es saludo/despedida
        if len(texto) <= 2 and texto in ruido:
            return True
        
        # Si es solo "no" o "si"
        if texto in ['no', 'si', 'sí']:
            return True
        
        return False
    
    def _es_saludo(self, texto):
        """Detecta si el mensaje es un saludo"""
        from ..constants import SALUDOS
        return any(saludo in texto for saludo in SALUDOS)
    
    def _es_despedida(self, texto):
        """Detecta si el mensaje es una despedida"""
        return (any(d in texto for d in self.despedidas) and 
                len(texto.split()) <= 4)
    
    def _extraer_actividad_realizada(self, texto):
        """Extrae la actividad que el usuario dice haber realizado"""
        for palabra in ['ya hice', 'ya termine', 'ya complete', 'acabo de']:
            if palabra in texto:
                actividad = texto.split(palabra)[1]
                actividad = actividad.split(',')[0].split('¿')[0].strip()
                return actividad
        return ""