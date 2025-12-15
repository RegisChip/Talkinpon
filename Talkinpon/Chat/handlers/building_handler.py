'''
Manejador de respuestas sobre edificios - ACTUALIZADO
Usa AreaEdificio y TipoArea para información precisa
'''
from Ubicaciones.models import Edificio, Salon, AreaEdificio, TipoArea
from ..constants import MAX_SALONES_MOSTRAR

class BuildingHandler:
    """Maneja las respuestas sobre edificios y salones"""
    
    def consultar_edificio(self, edificio_nombre):
        """Consulta información de un edificio desde la BD"""
        try:
            edificio = Edificio.objects.filter(nombre__iexact=edificio_nombre).first()
            
            if not edificio:
                return None
            
            # Obtener salones
            salones = edificio.salones.all()
            lista_salones = [s.numero for s in salones]
            
            # Obtener áreas del edificio (departamentos, laboratorios, baños, etc.)
            areas = AreaEdificio.objects.filter(
                edificio=edificio
            ).select_related('tipo')
            
            # Clasificar áreas por tipo
            areas_por_tipo = {}
            for area in areas:
                tipo_nombre = area.tipo.nombre
                if tipo_nombre not in areas_por_tipo:
                    areas_por_tipo[tipo_nombre] = []
                areas_por_tipo[tipo_nombre].append(area.nombre)
            
            return {
                'nombre': edificio.nombre,
                'nombre_especial': edificio.nombre_especial or '',
                'uso': edificio.uso,
                'num_salones': edificio.num_salones,
                'salones': lista_salones[:MAX_SALONES_MOSTRAR],
                'areas_por_tipo': areas_por_tipo,  # NUEVO
                'edificio_obj': edificio  # Para consultas adicionales
            }
        
        except Exception as e:
            print(f"Error consultando edificio: {e}")
            return None
    
    def consultar_salon(self, salon_numero):
        """Busca un salón específico"""
        try:
            salon = Salon.objects.filter(numero__iexact=salon_numero).first()
            
            if not salon:
                return None
            
            return {
                'salon_numero': salon.numero,
                'edificio_nombre': salon.edificio.nombre,
                'tipo': salon.tipo or 'salón',
                'capacidad': salon.capacidad
            }
        
        except Exception as e:
            print(f"Error consultando salón: {e}")
            return None
    
    def buscar_laboratorio_especifico(self, nombre_lab):
        """
        Busca un laboratorio específico por nombre (ej: LC3, LC 3, LC 1)
        
        Returns:
            dict con info del laboratorio y su edificio o None
        """
        try:
            # Normalizar nombre (quitar espacios extras, mayúsculas)
            nombre_normalizado = nombre_lab.strip().upper().replace('  ', ' ')
            
            # Buscar en AreaEdificio con tipo "laboratorio"
            tipo_lab = TipoArea.objects.filter(nombre__iexact='laboratorio').first()
            
            if not tipo_lab:
                print("❌ Tipo 'laboratorio' no encontrado en TipoArea")
                return None
            
            print(f"🔍 Buscando laboratorio: '{nombre_normalizado}'")
            
            # INTENTO 1: Búsqueda exacta
            area = AreaEdificio.objects.filter(
                tipo=tipo_lab,
                nombre__iexact=nombre_normalizado
            ).select_related('edificio').first()
            
            if area:
                print(f"✅ Encontrado (exacto): {area.nombre} en edificio {area.edificio.nombre}")
                return {
                    'nombre': area.nombre,
                    'edificio_nombre': area.edificio.nombre,
                    'edificio_id': area.edificio.id_edificio,
                    'tipo': area.tipo.nombre
                }
            
            # INTENTO 2: Búsqueda con LIKE (contiene)
            area = AreaEdificio.objects.filter(
                tipo=tipo_lab,
                nombre__icontains=nombre_normalizado
            ).select_related('edificio').first()
            
            if area:
                print(f"✅ Encontrado (contiene): {area.nombre} en edificio {area.edificio.nombre}")
                return {
                    'nombre': area.nombre,
                    'edificio_nombre': area.edificio.nombre,
                    'edificio_id': area.edificio.id_edificio,
                    'tipo': area.tipo.nombre
                }
            
            # INTENTO 3: Búsqueda con regex flexible para LC
            # Ejemplo: buscar "LC 1" o "LC1" o "LC  1"
            if 'LC' in nombre_normalizado:
                # Extraer número
                import re
                match = re.search(r'LC\s*(\d+)', nombre_normalizado)
                if match:
                    numero = match.group(1)
                    # Buscar con regex que permita 0 o más espacios
                    area = AreaEdificio.objects.filter(
                        tipo=tipo_lab,
                        nombre__iregex=rf'LC\s*{numero}\b'
                    ).select_related('edificio').first()
                    
                    if area:
                        print(f"✅ Encontrado (regex): {area.nombre} en edificio {area.edificio.nombre}")
                        return {
                            'nombre': area.nombre,
                            'edificio_nombre': area.edificio.nombre,
                            'edificio_id': area.edificio.id_edificio,
                            'tipo': area.tipo.nombre
                        }
            
            print(f"❌ No se encontró el laboratorio: {nombre_normalizado}")
            
            # Debug: Mostrar laboratorios disponibles
            labs_disponibles = AreaEdificio.objects.filter(tipo=tipo_lab).values_list('nombre', flat=True)[:5]
            print(f"📋 Laboratorios disponibles (muestra): {list(labs_disponibles)}")
            
            return None
        
        except Exception as e:
            print(f"❌ Error buscando laboratorio: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def construir_respuesta(self, info, tipo_consulta):
        """
        Construye respuesta según el tipo de consulta
        
        Args:
            info: dict con información del edificio o salón
            tipo_consulta: tipo de consulta detectado
        """
        if not info:
            return "Lo siento, no encontré información sobre eso 😔 ¿Podrías verificar el nombre? 🤔"
        
        # Delegar a métodos específicos
        metodos = {
            'salon_especifico': self._respuesta_salon,
            'uso_edificio': self._respuesta_uso,
            'baños': self._respuesta_baños,
            'salones_edificio': self._respuesta_salones,
            'laboratorios': self._respuesta_laboratorios,
            'contenido_general': self._respuesta_contenido,
            'info_general': self._respuesta_general,
            'laboratorio_especifico': self._respuesta_laboratorio_especifico,  # NUEVO
        }
        
        metodo = metodos.get(tipo_consulta, self._respuesta_general)
        return metodo(info)
    
    # ==========================================
    # MÉTODOS DE RESPUESTA ESPECÍFICOS
    # ==========================================
    
    def _respuesta_salon(self, info):
        """Respuesta para salón específico"""
        respuesta = f"📍 Salón {info['salon_numero']}\n\n"
        respuesta += f"Se encuentra en el Edificio {info['edificio_nombre']}\n\n"
        
        if info.get('tipo'):
            respuesta += f"Tipo: {info['tipo']}\n"
        
        if info.get('capacidad'):
            respuesta += f"Capacidad: {info['capacidad']} personas"
        
        return respuesta
    
    def _respuesta_uso(self, info):
        """Respuesta sobre el uso del edificio"""
        respuesta = f"📍 Edificio {info['nombre']}\n\n"
        respuesta += f"{info['uso']}\n\n"
        
        if info.get('nombre_especial'):
            respuesta += f"También conocido como: *{info['nombre_especial']}*\n\n"
        
        if info.get('num_salones', 0) > 0:
            respuesta += f"Este edificio cuenta con **{info['num_salones']} salones**."
        
        return respuesta
    
    def _respuesta_baños(self, info):
        """Respuesta sobre baños - USA AreaEdificio"""
        areas_por_tipo = info.get('areas_por_tipo', {})
        
        # Buscar baños en las áreas
        baños = areas_por_tipo.get('baño', [])
        
        if baños:
            respuesta = f"✅ Sí, el edificio {info['nombre']} tiene baños.\n\n"
            respuesta += f"📍 Ubicación: {', '.join(baños)}"
        else:
            respuesta = f"❌ No encontré información sobre baños en el edificio {info['nombre']}.\n\n"
            
            # Mostrar qué hay en el edificio
            if areas_por_tipo:
                respuesta += "📋 Este edificio cuenta con:\n"
                for tipo, areas in list(areas_por_tipo.items())[:3]:
                    respuesta += f"• {tipo.capitalize()}: {areas[0]}"
                    if len(areas) > 1:
                        respuesta += f" (y {len(areas)-1} más)"
                    respuesta += "\n"
        
        return respuesta
    
    def _respuesta_salones(self, info):
        """Respuesta sobre salones del edificio"""
        respuesta = f"📚 Salones en el Edificio {info['nombre']}\n\n"
        
        if info.get('salones') and len(info['salones']) > 0:
            salones_lista = ', '.join(info['salones'])
            respuesta += f"Salones: {salones_lista}\n\n"
            respuesta += f"Total: {info['num_salones']} salones"
        else:
            respuesta += "No encontré información detallada sobre salones específicos."
            if info.get('num_salones', 0) > 0:
                respuesta += f"\n\nSin embargo, el edificio cuenta con {info['num_salones']} salones."
        
        return respuesta
    
    def _respuesta_laboratorios(self, info):
        """Respuesta sobre laboratorios - USA AreaEdificio"""
        areas_por_tipo = info.get('areas_por_tipo', {})
        
        # Buscar laboratorios en las áreas
        laboratorios = areas_por_tipo.get('laboratorio', [])
        
        if laboratorios:
            respuesta = f"🔬 Edificio {info['nombre']} - Laboratorios\n\n"
            respuesta += f"Este edificio cuenta con {len(laboratorios)} laboratorio(s):\n\n"
            
            for lab in laboratorios:
                respuesta += f"• {lab}\n"
        else:
            respuesta = f"❌ No encontré laboratorios en el edificio {info['nombre']}.\n\n"
            
            # Mostrar qué hay en el edificio
            if areas_por_tipo:
                respuesta += "📋 Este edificio cuenta con:\n"
                for tipo, areas in list(areas_por_tipo.items())[:3]:
                    respuesta += f"• {tipo.capitalize()}: {areas[0]}"
                    if len(areas) > 1:
                        respuesta += f" (y {len(areas)-1} más)"
                    respuesta += "\n"
        
        return respuesta
    
    def _respuesta_laboratorio_especifico(self, info):
        """Respuesta para laboratorio específico (ej: LC3)"""
        respuesta = f"🔬 {info['nombre']}\n\n"
        respuesta += f"📍 Se encuentra en el Edificio {info['edificio_nombre']}"
        return respuesta
    
    def _respuesta_contenido(self, info):
        """Respuesta sobre contenido general - USA AreaEdificio"""
        respuesta = f"📍 Edificio {info['nombre']}\n\n"
        
        if info.get('nombre_especial'):
            respuesta += f"También conocido como: {info['nombre_especial']}\n\n"
        
        # Mostrar áreas por tipo
        areas_por_tipo = info.get('areas_por_tipo', {})
        
        if areas_por_tipo:
            respuesta += "Este edificio cuenta con:\n\n"
            
            for tipo, areas in areas_por_tipo.items():
                respuesta += f"**{tipo.capitalize()}** ({len(areas)}):\n"
                # Mostrar máximo 3 áreas por tipo
                for area in areas[:3]:
                    respuesta += f"• {area}\n"
                if len(areas) > 3:
                    respuesta += f"  _(y {len(areas)-3} más)_\n"
                respuesta += "\n"
        
        # Salones
        if info.get('num_salones', 0) > 0:
            respuesta += f"**Salones**: {info['num_salones']}"
        
        return respuesta
    
    def _respuesta_general(self, info):
        """Respuesta de información general"""
        respuesta = f"📍 Edificio {info['nombre']}\n\n"
        
        if info.get('nombre_especial'):
            respuesta += f"También conocido como: {info['nombre_especial']}\n\n"
        
        respuesta += f"{info['uso']}\n\n"
        
        # Áreas destacadas
        areas_por_tipo = info.get('areas_por_tipo', {})
        if areas_por_tipo:
            tipos_importantes = ['departamento', 'laboratorio', 'oficina']
            for tipo in tipos_importantes:
                if tipo in areas_por_tipo:
                    areas = areas_por_tipo[tipo]
                    respuesta += f"\n**{tipo.capitalize()}s**: "
                    respuesta += f"{', '.join(areas[:3])}"
                    if len(areas) > 3:
                        respuesta += f" (y {len(areas)-3} más)"
        
        return respuesta