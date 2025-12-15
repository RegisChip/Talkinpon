'''
Handler universal de ubicaciones específicas
Busca CUALQUIER área/departamento/laboratorio/sala en la BD
'''
from Ubicaciones.models import AreaEdificio, TipoArea, Edificio
from fuzzywuzzy import fuzz
from django.db.models import Q

class UniversalLocationHandler:
    """
    Handler que busca cualquier ubicación específica en AreaEdificio
    Usa búsqueda fuzzy para manejar errores de tipeo
    """
    
    def __init__(self):
        # Umbral de similitud para fuzzy matching (0-100)
        self.umbral_similitud = 70
        
        # Mapeo de términos comunes a nombres oficiales
        self.alias_comunes = {
            # Laboratorios
            'lc1': 'LC 1',
            'lc2': 'LC 2',
            'lc3': 'LC 3',
            'lc 1': 'LC 1',
            'lc 2': 'LC 2',
            'lc 3': 'LC 3',
            
            # Departamentos
            'control escolar': 'Control Escolar',
            'control': 'Control Escolar',
            'becas': 'Becas',
            'titulacion': 'Titulación',
            'titulación': 'Titulación',
            'caja': 'Caja',
            'recursos humanos': 'Recursos Humanos',
            'rh': 'Recursos Humanos',
            'enfermeria': 'Enfermería',
            'enfermería': 'Enfermería',
            'psicologia': 'Psicología',
            'psicología': 'Psicología',
            
            # Centros y lugares especiales
            'cle': 'Centro de Lenguas Extranjeras (CLE)',
            'centro de lenguas': 'Centro de Lenguas Extranjeras (CLE)',
            'lenguas extranjeras': 'Centro de Lenguas Extranjeras (CLE)',
            'gimnasio': 'Gimnasio',
            'biblioteca': 'Jefatura de Centro de Información',
            'cafeteria': 'Ponys Cafetería',
            'cafetería': 'Ponys Cafetería',
            'comedor': 'Comedor Tec',
            
            # Salas
            'sala memorial': 'Sala Memorial',
            'sala de juntas': 'Sala de Juntas',
            'sala audiovisual': 'Sala Audiovisual',
            'sala de danza': 'Salón de Danza',
        }
    
    def buscar_ubicacion(self, nombre_buscado):
        """
        Busca una ubicación específica en la BD
        
        Args:
            nombre_buscado: Texto que el usuario escribió
        
        Returns:
            dict con resultados o None
        """
        try:
            print(f"🔍 Buscando ubicación: '{nombre_buscado}'")
            
            # INTENTO 1: Buscar en alias comunes
            nombre_normalizado = nombre_buscado.lower().strip()
            if nombre_normalizado in self.alias_comunes:
                nombre_oficial = self.alias_comunes[nombre_normalizado]
                print(f"   ✅ Encontrado en alias: {nombre_oficial}")
                return self._buscar_exacto(nombre_oficial)
            
            # INTENTO 2: Búsqueda exacta (case insensitive)
            resultado = self._buscar_exacto(nombre_buscado)
            if resultado:
                return resultado
            
            # INTENTO 3: Búsqueda con ICONTAINS
            resultado = self._buscar_contiene(nombre_buscado)
            if resultado:
                return resultado
            
            # INTENTO 4: Búsqueda fuzzy (similitud de texto)
            resultado = self._buscar_fuzzy(nombre_buscado)
            if resultado:
                return resultado
            
            print(f"   ❌ No encontrado: {nombre_buscado}")
            return None
        
        except Exception as e:
            print(f"❌ Error buscando ubicación: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def _buscar_exacto(self, nombre):
        """Búsqueda exacta case-insensitive"""
        areas = AreaEdificio.objects.filter(
            nombre__iexact=nombre
        ).select_related('edificio', 'tipo')
        
        if areas.exists():
            print(f"   ✅ Búsqueda exacta: {areas.count()} resultado(s)")
            return self._formatear_resultados(areas, 'exacta')
        
        return None
    
    def _buscar_contiene(self, nombre):
        """Búsqueda que contenga el texto"""
        # Dividir en palabras clave
        palabras = nombre.lower().split()
        
        # Buscar áreas que contengan TODAS las palabras
        query = Q()
        for palabra in palabras:
            if len(palabra) > 2:  # Ignorar palabras muy cortas
                query &= Q(nombre__icontains=palabra)
        
        areas = AreaEdificio.objects.filter(
            query
        ).select_related('edificio', 'tipo')
        
        if areas.exists():
            print(f"   ✅ Búsqueda contiene: {areas.count()} resultado(s)")
            return self._formatear_resultados(areas, 'contiene')
        
        return None
    
    def _buscar_fuzzy(self, nombre):
        """Búsqueda fuzzy (similitud de texto) para manejar errores de tipeo"""
        print(f"   🔎 Búsqueda fuzzy...")
        
        # Obtener todas las áreas
        todas_areas = AreaEdificio.objects.all().select_related('edificio', 'tipo')
        
        coincidencias = []
        
        for area in todas_areas:
            # Calcular similitud
            similitud = fuzz.ratio(nombre.lower(), area.nombre.lower())
            
            # También verificar similitud parcial
            similitud_parcial = fuzz.partial_ratio(nombre.lower(), area.nombre.lower())
            
            similitud_maxima = max(similitud, similitud_parcial)
            
            if similitud_maxima >= self.umbral_similitud:
                coincidencias.append({
                    'area': area,
                    'similitud': similitud_maxima
                })
        
        if coincidencias:
            # Ordenar por similitud (mayor a menor)
            coincidencias.sort(key=lambda x: x['similitud'], reverse=True)
            
            print(f"   ✅ Búsqueda fuzzy: {len(coincidencias)} coincidencia(s)")
            print(f"   📊 Mejor match: {coincidencias[0]['area'].nombre} ({coincidencias[0]['similitud']}%)")
            
            # Convertir a QuerySet
            areas_ids = [c['area'].id_area for c in coincidencias[:3]]  # Top 3
            areas = AreaEdificio.objects.filter(
                id_area__in=areas_ids
            ).select_related('edificio', 'tipo')
            
            return self._formatear_resultados(areas, 'fuzzy', coincidencias[0]['similitud'])
        
        return None
    
    def _formatear_resultados(self, areas, tipo_busqueda, similitud=100):
        """Formatea los resultados de la búsqueda"""
        resultados = []
        
        for area in areas:
            resultados.append({
                'id_area': area.id_area,
                'nombre': area.nombre,
                'tipo': area.tipo.nombre,
                'tipo_id': area.tipo.id_tipo,
                'edificio_nombre': area.edificio.nombre,
                'edificio_id': area.edificio.id_edificio,
                'edificio_especial': area.edificio.nombre_especial or '',
            })
        
        return {
            'encontrado': True,
            'tipo_busqueda': tipo_busqueda,
            'similitud': similitud,
            'total_resultados': len(resultados),
            'resultados': resultados
        }
    
    def construir_respuesta(self, info_busqueda, nombre_buscado):
        """
        Construye respuesta para el usuario
        
        Args:
            info_busqueda: dict con resultados de búsqueda
            nombre_buscado: texto que el usuario escribió
        """
        if not info_busqueda or not info_busqueda.get('encontrado'):
            return self._respuesta_no_encontrado(nombre_buscado)
        
        resultados = info_busqueda['resultados']
        total = info_busqueda['total_resultados']
        
        # Caso 1: Un solo resultado
        if total == 1:
            return self._respuesta_unica(resultados[0])
        
        # Caso 2: Múltiples resultados del mismo lugar en diferentes edificios
        if self._es_mismo_lugar_multiples_edificios(resultados):
            return self._respuesta_multiples_edificios(resultados)
        
        # Caso 3: Múltiples lugares diferentes (sugerir)
        return self._respuesta_sugerencias(resultados, nombre_buscado)
    
    def _es_mismo_lugar_multiples_edificios(self, resultados):
        """Verifica si todos los resultados son el mismo lugar en diferentes edificios"""
        if len(resultados) < 2:
            return False
        
        # Simplificar nombres (quitar números entre paréntesis)
        import re
        nombres_base = [
            re.sub(r'\s*\(\d+\)\s*$', '', r['nombre']).strip()
            for r in resultados
        ]
        
        # Verificar si todos son iguales
        return len(set(nombres_base)) == 1
    
    def _respuesta_unica(self, resultado):
        """Respuesta cuando hay un solo resultado"""
        icono_tipo = self._obtener_icono_tipo(resultado['tipo'])
        
        respuesta = f"{icono_tipo} **{resultado['nombre']}**\n\n"
        respuesta += f"📍 Se encuentra en el **Edificio {resultado['edificio_nombre']}**"
        
        if resultado['edificio_especial']:
            respuesta += f" _{resultado['edificio_especial']}_"
        
        respuesta += f"\n\n📋 Tipo: {resultado['tipo'].capitalize()}"
        
        return respuesta
    
    def _respuesta_multiples_edificios(self, resultados):
        """Respuesta cuando el mismo lugar está en varios edificios"""
        primer_resultado = resultados[0]
        nombre_base = primer_resultado['nombre'].split('(')[0].strip()
        
        icono_tipo = self._obtener_icono_tipo(primer_resultado['tipo'])
        
        respuesta = f"{icono_tipo} **{nombre_base}**\n\n"
        respuesta += f"Encontré {len(resultados)} ubicación(es):\n\n"
        
        for resultado in resultados:
            respuesta += f"• **Edificio {resultado['edificio_nombre']}**"
            
            if resultado['edificio_especial']:
                respuesta += f" _{resultado['edificio_especial']}_"
            
            respuesta += "\n"
        
        respuesta += f"\n📋 Tipo: {primer_resultado['tipo'].capitalize()}"
        
        return respuesta
    
    def _respuesta_sugerencias(self, resultados, nombre_buscado):
        """Respuesta cuando hay múltiples lugares diferentes"""
        respuesta = f"🔍 Encontré varios lugares relacionados con **\"{nombre_buscado}\"**:\n\n"
        
        for i, resultado in enumerate(resultados[:5], 1):
            icono = self._obtener_icono_tipo(resultado['tipo'])
            respuesta += f"{i}. {icono} **{resultado['nombre']}**\n"
            respuesta += f"   📍 Edificio {resultado['edificio_nombre']}\n\n"
        
        if len(resultados) > 5:
            respuesta += f"_(y {len(resultados)-5} más)_\n\n"
        
        respuesta += "💡 _¿Cuál estabas buscando?_"
        
        return respuesta
    
    def _respuesta_no_encontrado(self, nombre_buscado):
        """Respuesta cuando no se encuentra el lugar"""
        respuesta = f"❌ No encontré **\"{nombre_buscado}\"** en el campus.\n\n"
        respuesta += "¿Podrías verificar el nombre?\n\n"
        respuesta += "**Algunos lugares disponibles:**\n"
        respuesta += "• Control Escolar\n"
        respuesta += "• Centro de Lenguas Extranjeras (CLE)\n"
        respuesta += "• Laboratorios LC 1, LC 2, LC 3\n"
        respuesta += "• Gimnasio\n"
        respuesta += "• Cafetería / Comedor"
        
        return respuesta
    
    def _obtener_icono_tipo(self, tipo):
        """Retorna el icono apropiado según el tipo"""
        iconos = {
            'laboratorio': '🔬',
            'aula': '📚',
            'cubiculo': '💼',
            'sala': '🏛️',
            'baño': '🚻',
            'oficina': '📋',
            'departamento': '🏢',
            'almacen': '📦',
            'cafeteria': '☕',
            'gimnasio': '💪',
            'comedor': '🍽️',
            'delegacion': '🏛️',
            'otros': '📍',
        }
        return iconos.get(tipo.lower(), '📍')