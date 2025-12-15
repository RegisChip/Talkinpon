# Talkinpon\Talkinpon\Chat\handlers\route_handler.py

'''
Manejador de respuestas para rutas entre edificios
'''

from ..helpers import obtener_ids_edificios

class RouteHandler: # Maneja las respuestas para solicitudes de rutas
    
    def construir_respuesta(self, solicitud_ruta):

        '''
        Construye respuesta con comando para abrir mapa con ruta
        s
        Args:
            solicitud_ruta: dict con 'origen', 'destino'
        
        Returns:
            dict con comando para el frontend o string de error
        '''

        origen = solicitud_ruta['origen']
        destino = solicitud_ruta['destino']
        
        # Obtener IDs de los edificios
        id_origen, id_destino = obtener_ids_edificios(origen, destino)
        
        if not id_origen or not id_destino:
            return f"Lo siento, no encontré los edificios {origen} y/o {destino}. ¿Puedes verificar los nombres?"
        
        # Generar comando para el frontend
        return {
            'tipo': 'abrir_mapa_con_ruta',
            'origen_id': id_origen,
            'destino_id': id_destino,
            'origen_nombre': origen,
            'destino_nombre': destino,
            'mensaje': f"🗺️ ¡Perfecto! Te mostraré la ruta del edificio {origen} al {destino}"
        }