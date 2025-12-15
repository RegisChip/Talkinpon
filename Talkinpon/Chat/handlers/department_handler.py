'''
Manejador de respuestas sobre departamentos - ACTUALIZADO
Usa AreaEdificio y TipoArea para búsquedas precisas
'''
from Ubicaciones.models import AreaEdificio, TipoArea, Edificio

class DepartmentHandler:
    """Maneja las respuestas sobre departamentos"""
    
    def buscar_departamento_en_bd(self, nombre_departamento):
        """
        Busca un departamento en la tabla AreaEdificio
        
        Args:
            nombre_departamento: Nombre oficial del departamento a buscar
        
        Returns:
            dict con info del departamento o None
        """
        try:
            # Obtener tipo "departamento" u "oficina"
            tipos_validos = TipoArea.objects.filter(
                nombre__in=['departamento', 'oficina']
            )
            
            if not tipos_validos.exists():
                return None
            
            # Buscar área que coincida
            area = AreaEdificio.objects.filter(
                tipo__in=tipos_validos,
                nombre__icontains=nombre_departamento
            ).select_related('edificio').first()
            
            if not area:
                # Búsqueda más flexible
                palabras = nombre_departamento.split()
                for palabra in palabras:
                    if len(palabra) > 3:  # Evitar palabras muy cortas
                        area = AreaEdificio.objects.filter(
                            tipo__in=tipos_validos,
                            nombre__icontains=palabra
                        ).select_related('edificio').first()
                        
                        if area:
                            break
            
            if not area:
                return None
            
            return {
                'nombre': area.nombre,
                'edificio_nombre': area.edificio.nombre,
                'edificio_id': area.edificio.id_edificio,
                'tipo': area.tipo.nombre
            }
        
        except Exception as e:
            print(f"Error buscando departamento: {e}")
            return None
    
    def listar_departamentos_edificio(self, edificio_nombre):
        """
        Lista todos los departamentos y oficinas de un edificio
        
        Args:
            edificio_nombre: Letra del edificio (ej: 'A')
        
        Returns:
            dict con lista de departamentos o None
        """
        try:
            edificio = Edificio.objects.filter(nombre__iexact=edificio_nombre).first()
            
            if not edificio:
                return None
            
            # Obtener tipos relevantes
            tipos = TipoArea.objects.filter(
                nombre__in=['departamento', 'oficina']
            )
            
            areas = AreaEdificio.objects.filter(
                edificio=edificio,
                tipo__in=tipos
            ).select_related('tipo')
            
            if not areas.exists():
                return None
            
            departamentos = [
                {
                    'nombre': area.nombre,
                    'tipo': area.tipo.nombre
                }
                for area in areas
            ]
            
            return {
                'edificio_nombre': edificio.nombre,
                'edificio_especial': edificio.nombre_especial or '',
                'departamentos': departamentos
            }
        
        except Exception as e:
            print(f"Error listando departamentos: {e}")
            return None
    
    def construir_respuesta(self, info_depto):
        """
        Construye respuesta para consulta de departamento
        
        Args:
            info_depto: dict con 'departamento', 'origen_edificio'
        
        Returns:
            string con respuesta o dict con comando de ruta
        """
        departamento_nombre = info_depto['departamento']
        origen = info_depto.get('origen_edificio')
        
        # Buscar departamento en BD
        depto_bd = self.buscar_departamento_en_bd(departamento_nombre)
        
        if not depto_bd:
            # Fallback: respuesta genérica
            return self._respuesta_no_encontrado(departamento_nombre)
        
        edificio_destino = depto_bd['edificio_nombre']
        
        # Usuario viene de otro edificio → ofrecer ruta
        if origen and origen.upper() != edificio_destino.upper():
            edificio_origen_obj = Edificio.objects.filter(nombre__iexact=origen).first()
            
            if edificio_origen_obj:
                return {
                    'tipo': 'departamento_con_ruta',
                    'departamento': depto_bd['nombre'],
                    'origen_id': edificio_origen_obj.id_edificio,
                    'destino_id': depto_bd['edificio_id'],
                    'origen_nombre': origen.upper(),
                    'destino_nombre': edificio_destino,
                    'mensaje': f"📍 {depto_bd['nombre']} se encuentra en el Edificio {edificio_destino}.\n\n🗺️ Te mostraré la ruta desde el edificio {origen.upper()}."
                }
        
        # Solo información de ubicación
        return self._respuesta_ubicacion_simple(depto_bd)
    
    def _respuesta_ubicacion_simple(self, depto_info):
        """Genera respuesta simple de ubicación"""
        respuesta = f"📍 **{depto_info['nombre']}**\n\n"
        respuesta += f"Se encuentra en el **Edificio {depto_info['edificio_nombre']}**\n\n"
        respuesta += f"Tipo: {depto_info['tipo'].capitalize()}"
        
        # Listar otros departamentos del mismo edificio
        otros = self.listar_departamentos_edificio(depto_info['edificio_nombre'])
        
        if otros and len(otros['departamentos']) > 1:
            respuesta += f"\n\n**Otros servicios en el Edificio {depto_info['edificio_nombre']}:**\n"
            
            for depto in otros['departamentos'][:5]:
                if depto['nombre'] != depto_info['nombre']:
                    respuesta += f"• {depto['nombre']}\n"
            
            if len(otros['departamentos']) > 5:
                respuesta += f"• _(y {len(otros['departamentos'])-5} más)_"
        
        return respuesta
    
    def _respuesta_no_encontrado(self, nombre_buscado):
        """Respuesta cuando no se encuentra el departamento"""
        respuesta = f"❌ No encontré información sobre **{nombre_buscado}**.\n\n"
        respuesta += "¿Podrías verificar el nombre o intentar con otro término?\n\n"
        respuesta += "Por ejemplo:\n"
        respuesta += "• Control Escolar\n"
        respuesta += "• Becas\n"
        respuesta += "• Titulación\n"
        respuesta += "• Recursos Humanos"
        return respuesta