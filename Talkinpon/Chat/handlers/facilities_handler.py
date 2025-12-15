'''
Manejador de consultas generales sobre instalaciones
Busca y lista instalaciones en todo el campus
'''
from Ubicaciones.models import AreaEdificio, TipoArea, Edificio
from django.db.models import Count

class GeneralFacilitiesHandler:
    """Maneja consultas generales sobre instalaciones en todo el campus"""
    
    def buscar_instalaciones_por_tipo(self, tipo_area):
        """
        Busca todas las instalaciones de un tipo en todo el campus
        
        Args:
            tipo_area: nombre del tipo (ej: 'baño', 'laboratorio')
        
        Returns:
            dict con edificios que tienen esa instalación
        """
        try:
            # Obtener el tipo de área
            tipo_obj = TipoArea.objects.filter(nombre__iexact=tipo_area).first()
            
            if not tipo_obj:
                return None
            
            # Buscar todas las áreas de ese tipo
            areas = AreaEdificio.objects.filter(
                tipo=tipo_obj
            ).select_related('edificio').order_by('edificio__nombre')
            
            if not areas.exists():
                return None
            
            # Agrupar por edificio
            edificios_con_instalacion = {}
            
            for area in areas:
                edificio_nombre = area.edificio.nombre
                
                if edificio_nombre not in edificios_con_instalacion:
                    edificios_con_instalacion[edificio_nombre] = {
                        'edificio_id': area.edificio.id_edificio,
                        'nombre_especial': area.edificio.nombre_especial or '',
                        'instalaciones': []
                    }
                
                edificios_con_instalacion[edificio_nombre]['instalaciones'].append(
                    area.nombre
                )
            
            return {
                'tipo': tipo_obj.nombre,
                'total_edificios': len(edificios_con_instalacion),
                'edificios': edificios_con_instalacion
            }
        
        except Exception as e:
            print(f"Error buscando instalaciones: {e}")
            return None
    
    def construir_respuesta(self, info_instalaciones):
        """
        Construye respuesta con lista de edificios que tienen la instalación
        
        Args:
            info_instalaciones: dict con información de las instalaciones
        
        Returns:
            string con respuesta formateada
        """
        if not info_instalaciones:
            return "Lo siento, no encontré esa instalación en el campus 😔"
        
        tipo = info_instalaciones['tipo']
        edificios = info_instalaciones['edificios']
        total = info_instalaciones['total_edificios']
        
        # Encabezado según el tipo
        encabezados = {
            'baño': '🚻 Baños en el Campus',
            'laboratorio': '🔬 Laboratorios en el Campus',
            'cubiculo': '📚 Cubículos en el Campus',
            'sala': '🏛️ Salas en el Campus',
            'cafeteria': '☕ Cafeterías en el Campus',
            'comedor': '🍽️ Comedores en el Campus',
            'departamento': '🏢 Departamentos en el Campus',
            'oficina': '📋 Oficinas en el Campus',
            'almacen': '📦 Almacenes en el Campus',
        }
        
        encabezado = encabezados.get(tipo, f'📍 {tipo.capitalize()}s en el Campus')
        
        respuesta = f"{encabezado}\n\n"
        respuesta += f"Encontré {tipo}s en **{total} edificio(s)**:\n\n"
        
        # Listar edificios (ordenados alfabéticamente)
        edificios_ordenados = sorted(edificios.keys())
        
        for edificio_nombre in edificios_ordenados:
            info = edificios[edificio_nombre]
            instalaciones = info['instalaciones']
            
            # Nombre del edificio
            respuesta += f"**Edificio {edificio_nombre}**"
            
            if info['nombre_especial']:
                respuesta += f" _{info['nombre_especial']}_"
            
            respuesta += "\n"
            
            # Listar instalaciones (máximo 3 por edificio)
            if len(instalaciones) == 1:
                respuesta += f"  • {instalaciones[0]}\n"
            elif len(instalaciones) <= 3:
                for inst in instalaciones:
                    respuesta += f"  • {inst}\n"
            else:
                for inst in instalaciones[:3]:
                    respuesta += f"  • {inst}\n"
                respuesta += f"  • _(y {len(instalaciones)-3} más)_\n"
            
            respuesta += "\n"
        
        # Nota final
        respuesta += "💡 _Puedes preguntar sobre un edificio específico para más detalles._"
        
        return respuesta
    
    def construir_respuesta_compacta(self, info_instalaciones):
        """
        Construye respuesta más compacta (solo lista de edificios)
        Útil cuando hay muchos edificios
        """
        if not info_instalaciones:
            return "Lo siento, no encontré esa instalación en el campus 😔"
        
        tipo = info_instalaciones['tipo']
        edificios = info_instalaciones['edificios']
        total = info_instalaciones['total_edificios']
        
        # Encabezado
        encabezados = {
            'baño': '🚻 Baños disponibles en',
            'laboratorio': '🔬 Laboratorios disponibles en',
            'cafeteria': '☕ Cafeterías disponibles en',
            'comedor': '🍽️ Comedores disponibles en',
        }
        
        encabezado = encabezados.get(tipo, f'📍 {tipo.capitalize()}s disponibles en')
        
        respuesta = f"{encabezado}:\n\n"
        
        # Lista simple de edificios
        edificios_ordenados = sorted(edificios.keys())
        edificios_str = ', '.join([f"**{e}**" for e in edificios_ordenados])
        
        respuesta += f"{edificios_str}\n\n"
        respuesta += f"Total: {total} edificio(s) con {tipo}s"
        
        return respuesta