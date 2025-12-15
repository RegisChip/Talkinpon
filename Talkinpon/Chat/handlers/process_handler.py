#

'''
Manejador de respuestas para procesos administrativos
'''

from ..ollama_servidor import respuesta as ollama_respuesta
from ..helpers import obtener_contexto_reciente, extraer_numero_paso
from ..constants import MAX_PASOS_PROCESO_COMPLETO

class ProcessHandler: # Maneja las respuestas sobre procesos administrativos
    
    def __init__(self, buscador):

        '''
        Args:
            buscador: Instancia de BuscadorSemantico
        '''

        self.buscador = buscador

    def buscar_informacion(self, mensaje, intencion, estado, session_id):

        '''
        Busca la información relevante según la intención
        
        Returns:
            tuple (chunks_relevantes, tipo_consulta)
        '''

        tipo = intencion['tipo']
        proceso = intencion.get('proceso') or estado.get('proceso_actual')
        
        # Mapeo de tipos a métodos de búsqueda
        metodos = {
            'paso_especifico': lambda: self._buscar_paso_especifico(intencion, proceso),
            'continuacion_natural': lambda: self._buscar_continuacion(intencion, proceso),
            'info_proceso': lambda: self._buscar_info_proceso(mensaje, proceso),
            'proceso_completo': lambda: self._buscar_proceso_completo(proceso),
            'requisitos': lambda: self._buscar_requisitos(mensaje, proceso),
            'tiempo': lambda: self._buscar_tiempo(mensaje, proceso),
            'responsable': lambda: self._buscar_responsable(mensaje, proceso),
            'siguiente_paso': lambda: self._buscar_siguiente_paso(session_id, proceso),
        }
        
        if tipo in metodos:
            return metodos[tipo](), tipo
        
        # Búsqueda general por defecto
        chunks = self.buscador.buscar(mensaje, top_k=3, proceso_especifico=proceso)
        return chunks, 'general'
    
    # ====================================================================================
    
    # ==========================================
    # MÉTODOS DE BÚSQUEDA ESPECÍFICOS
    # ==========================================

    def _buscar_paso_especifico(self, intencion, proceso): # Busca un paso específico
        chunk = self.buscador.buscar_paso_especifico(
            proceso,
            intencion['numero_paso']
        )
        return [chunk] if chunk else []
    
    def _buscar_continuacion(self, intencion, proceso): # Busca el siguiente paso después de una actividad
        paso_realizado = self.buscador.buscar_paso_por_actividad(
            proceso,
            intencion.get('actividad_realizada', '')
        )
        
        if paso_realizado:
            siguiente = self.buscador.obtener_siguiente_paso(proceso, paso_realizado)
            return [siguiente] if siguiente else []
        
        # Fallback a búsqueda general
        return self.buscador.buscar(
            intencion.get('actividad_realizada', ''),
            top_k=2,
            proceso_especifico=proceso
        )
    
    def _buscar_info_proceso(self, mensaje, proceso): # Busca información general del proceso
        chunks_generales = self.buscador.obtener_info_general(proceso)
        
        # Asegurar relevancia
        for chunk in chunks_generales:
            if 'relevancia' not in chunk:
                chunk['relevancia'] = 1.0
        
        # Agregar pasos relevantes
        chunks_pasos = self.buscador.buscar(
            mensaje,
            top_k=3,
            proceso_especifico=proceso
        )
        
        return chunks_generales + chunks_pasos
    
    def _buscar_proceso_completo(self, proceso): # Busca todos los pasos de un proceso
        chunks_generales = self.buscador.obtener_info_general(proceso)
        
        for chunk in chunks_generales:
            if 'relevancia' not in chunk:
                chunk['relevancia'] = 1.0
        
        # Obtener primeros N pasos
        todos_pasos = self.buscador.obtener_todos_pasos(
            proceso,
            max_pasos=MAX_PASOS_PROCESO_COMPLETO
        )
        
        for chunk in todos_pasos:
            if 'relevancia' not in chunk:
                chunk['relevancia'] = 0.95
        
        return chunks_generales + todos_pasos
    
    def _buscar_requisitos(self, mensaje, proceso): # Busca requisitos del proceso
        chunks_req = self.buscador.buscar_requisitos(proceso, tipo='generales')
        
        for chunk in chunks_req:
            if 'relevancia' not in chunk:
                chunk['relevancia'] = 1.0
        
        # Agregar pasos con requisitos
        chunks_pasos = self.buscador.buscar(
            mensaje,
            top_k=2,
            proceso_especifico=proceso,
            filtro_tipo='paso'
        )
        
        return chunks_req + chunks_pasos
    
    def _buscar_tiempo(self, mensaje, proceso): # Busca información sobre tiempos
        return self.buscador.buscar(
            mensaje,
            top_k=3,
            proceso_especifico=proceso,
            filtro_tipo='paso'
        )
    
    def _buscar_responsable(self, mensaje, proceso): # Busca información sobre responsables
        return self.buscador.buscar(
            mensaje,
            top_k=3,
            proceso_especifico=proceso,
            filtro_tipo='paso'
        )
    
    def _buscar_siguiente_paso(self, session_id, proceso): # Busca el siguiente paso basándose en el contexto
        contexto = obtener_contexto_reciente(session_id, max_msgs=4)
        ultimo_paso = None
        
        # Buscar último paso mencionado
        for msg in reversed(contexto):
            if msg['role'] in ['user', 'assistant']:
                numero = extraer_numero_paso(msg['content'])
                if numero:
                    ultimo_paso = numero
                    break
        
        if ultimo_paso and proceso:
            paso_actual = self.buscador.buscar_paso_especifico(proceso, ultimo_paso)
            
            if paso_actual:
                siguiente = self.buscador.obtener_siguiente_paso(proceso, paso_actual)
                
                if siguiente:
                    return [siguiente]
                else:
                    # Es el último paso
                    paso_actual['es_ultimo'] = True
                    return [paso_actual]
        
        # Fallback
        return self.buscador.buscar("siguiente paso", top_k=2, proceso_especifico=proceso)
    
    # ==========================================
    # CONSTRUCCIÓN DE PROMPTS
    # ==========================================
    
    def construir_prompt(self, pregunta, chunks, tipo_consulta):

        '''
        Construye el prompt optimizado para el LLM
        
        Returns:
            dict con role y content
        '''

        if not chunks:
            return self._prompt_sin_info(pregunta)
        
        # Extraer texto de chunks
        info_texto = self._formatear_chunks(chunks)
        
        # Instrucciones según tipo
        instrucciones = self._obtener_instrucciones(tipo_consulta)
        
        # Construir prompt
        prompt = f"""INFORMACIÓN:
                {info_texto}

                PREGUNTA: {pregunta}

                {instrucciones}

                IMPORTANTE:
                - NUNCA menciones claves técnicas (SS-01, CC-03, etc.)
                - Usa "Paso 1", "Paso 2", etc.
                - Sé conciso y directo

                RESPUESTA:"""
        
        return {"role": "user", "content": prompt}
    
    def _formatear_chunks(self, chunks): # Formatea los chunks para el prompt
        lines = []
        for chunk in chunks:
            texto = chunk['texto']
            # Limpiar redundancias
            texto = texto.replace('Proceso:', '').replace('Paso:', '').strip()
            lines.append(texto)
        return "\n\n".join(lines)
    
    def _obtener_instrucciones(self, tipo_consulta): # Obtiene las instrucciones específicas según el tipo
        instrucciones = {
            'paso_especifico': """Explica SOLO este paso:
            - Intro breve (1 línea)
            - Actividad detallada
            - Tiempo estimado
            - Responsable(s)
            - Requisitos (si hay)
            - Emoji final""",
                        
                        'proceso_completo': """Resume el proceso:
            - Intro breve (2 líneas)
            - Lista los primeros 5 pasos (formato: "Paso X: actividad")
            - Resumen final
            - Emoji final
            NO des todos los detalles.""",
                        
                        'default': """Responde estructurado:
            - Intro breve (1-2 líneas)
            - Lista numerada con puntos clave
            - Resumen final (1 línea)
            - Emoji final"""
        }
        
        return instrucciones.get(tipo_consulta, instrucciones['default'])
    
    def _prompt_sin_info(self, pregunta): # Genera prompt cuando no hay información
        return {
            "role": "user",
            "content": f'Pregunta: "{pregunta}"\n\nNo encontré información. Discúlpate brevemente y sugiere reformular.'
        }
    
    # ==========================================
    # GENERACIÓN DE RESPUESTA
    # ==========================================
    
    def generar_respuesta(self, prompt, session_id):

        '''
        Genera la respuesta final usando el LLM
        
        Args:
            prompt: dict con el prompt construido
            session_id: ID de sesión para contexto
        
        Returns:
            string con la respuesta generada
        '''

        from ..constants import MAX_CONTEXTO_RECIENTE
        
        # Obtener contexto previo
        mensajes_previos = obtener_contexto_reciente(session_id, max_msgs=2)
        mensajes_completos = mensajes_previos + [prompt]
        
        print("\n===== LLAMANDO AL LLM =====")
        for i, m in enumerate(mensajes_completos, 1):
            contenido = m.get('content', '')
            preview = contenido[:100] + "..." if len(contenido) > 100 else contenido
            print(f"[{i}] {m['role']}: {preview}")
        print("===== FIN =====\n")
        
        # Llamar al modelo
        respuesta = ollama_respuesta(mensajes_completos)
        
        print(f"✓ Respuesta generada: {respuesta[:100]}...\n")
        return respuesta