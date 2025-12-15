# Talkinpon/Chat/constants.py

"""
Constantes centralizadas del sistema de chat
"""

# ==========================================
# DEPARTAMENTOS DEL EDIFICIO A
# ==========================================
DEPARTAMENTOS_EDIFICIO_A = {
    # Departamentos y oficinas principales
    'caja': 'Caja',
    'control escolar': 'Control Escolar',
    'control': 'Control Escolar',
    'escolar': 'Control Escolar',
    'becas': 'Becas',
    'titulacion': 'Titulación',
    'titulación': 'Titulación',
    'certificacion': 'Certificación de Actas',
    'certificación': 'Certificación de Actas',
    'servicios escolares': 'Servicios Escolares',
    'servicios': 'Servicios Escolares',
    'enfermeria': 'Enfermería',
    'enfermería': 'Enfermería',
    'recursos humanos': 'Recursos Humanos',
    'rh': 'Recursos Humanos',
    'desarrollo academico': 'Desarrollo Académico',
    'desarrollo académico': 'Desarrollo Académico',
    'psicologia': 'Psicología',
    'psicología': 'Psicología',
    'comunicacion': 'Comunicación y Difusión',
    'comunicación': 'Comunicación y Difusión',
    'difusion': 'Comunicación y Difusión',
    'difusión': 'Comunicación y Difusión',
    'viaticos': 'Viáticos',
    'viáticos': 'Viáticos',
    'division de estudios': 'División de Estudios Profesionales',
    'división de estudios': 'División de Estudios Profesionales',
    'estudios profesionales': 'División de Estudios Profesionales',
    
    # Variantes comunes (acciones)
    'pagar': 'Caja',
    'pagos': 'Caja',
    'comprobante': 'Caja',
    'beca': 'Becas',
    'titularme': 'Titulación',
    'titulo': 'Titulación',
    'título': 'Titulación',
    'acta': 'Certificación de Actas',
    'constancia': 'Servicios Escolares',
    'kardex': 'Servicios Escolares',
}

# ==========================================
# KEYWORDS DE DETECCIÓN
# ==========================================
KEYWORDS_UBICACION = [
    'donde esta', 'dónde está', 'donde está',
    'donde queda', 'dónde queda',
    'donde se encuentra', 'dónde se encuentra',
    'ubicacion de', 'ubicación de',
    'en donde', 'en dónde',
    'como llego a', 'cómo llego a',
    'como voy a', 'cómo voy a',
    'ir a', 'voy a',
    'encontrar', 'busco',
    'esta la', 'está la', 'esta el', 'está el',
    'queda la', 'queda el',
]

KEYWORDS_EDIFICIO = [
    # Uso y función
    'para que sirve', 'para qué sirve', 'para que es', 'para qué es',
    'que se hace en', 'qué se hace en', 'que hacen en', 'qué hacen en',
    'que hay en', 'qué hay en', 'que tiene', 'qué tiene',
    
    # Contenido
    'que instalaciones', 'qué instalaciones', 'que areas', 'qué áreas',
    'que departamentos', 'qué departamentos', 'que oficinas', 'qué oficinas',
    
    # Baños
    'donde hay baños', 'dónde hay baños', 'baños en', 'hay baños',
    'tiene baños', 'sanitarios en', 'ir al baño',
    
    # Salones
    'que salones', 'qué salones', 'salones en', 'lista de salones',
    'aulas en', 'salon', 'salón', 'aula',
    
    # Laboratorios
    'laboratorio', 'laboratorios', 'labs en', 'lab ',
    
    # Ubicación general
    'donde queda', 'dónde queda', 'donde esta', 'dónde está',
    'ubicacion del edificio', 'nombre del edificio',
    
    # Info general
    'edificio', 'edificios', 'informacion del edificio',
]

KEYWORDS_RUTA = [
    # Movimiento
    'como llego', 'cómo llego', 'como voy', 'cómo voy',
    'como puedo ir', 'como llegar', 'ir al', 'voy al',
    
    # Ubicación
    'donde esta', 'dónde está', 'donde queda', 'ubicacion',
    
    # Ruta
    'ruta', 'camino', 'recorrido', 'indicaciones', 'mapa',
    
    # Posición actual
    'estoy en', 'me encuentro en', 'desde el', 'vengo del',
    
    # Coloquial
    'llevame', 'llévame', 'quiero ir', 'necesito ir',
]

# ==========================================
# MAPEO DE PROCESOS ADMINISTRATIVOS
# ==========================================
MAPEO_PROCESOS = {
    # Servicio Social
    'servicio social': 'Servicio Social',
    'servicio': 'Servicio Social',
    'social': 'Servicio Social',
    
    # Créditos Complementarios
    'creditos': 'Créditos Complementarios',
    'credito': 'Créditos Complementarios',
    'complementarios': 'Créditos Complementarios',
    'créditos': 'Créditos Complementarios',
    
    # Credencial
    'credencial': 'Credencial Escolar',
    'tramitar credencial': 'Credencial Escolar',
    
    # Sello
    'resellar': 'Sello Semestral de Credencial',
    'sello': 'Sello Semestral de Credencial',
    'sellar credencial': 'Sello Semestral de Credencial',
    
    # Constancia
    'constancia': 'Constancia de Estudios',
    'constancia de estudios': 'Constancia de Estudios',
    
    # Kardex
    'kardex': 'Kardex',
    'historial': 'Kardex',
    'calificaciones': 'Kardex',
    
    # Baja
    'baja': 'Baja Temporal',
    'baja temporal': 'Baja Temporal',
    'darme de baja': 'Baja Temporal',
    
    # Alta
    'alta': 'Alta después de Baja Temporal',
    'regresar': 'Alta después de Baja Temporal',
    'reingreso': 'Alta después de Baja Temporal',
}

# ==========================================
# PALABRAS DE SALUDO
# ==========================================
SALUDOS = [
    'hola', 'buenas', 'buen dia', 'buen día', 
    'buenas tardes', 'buenas noches', 
    'como estas', 'cómo estás', 'que tal', 'qué tal',
    'hello', 'hi', 'hey',
    'que onda', 'qué onda',
    'tengo una duda', 'tengo duda'
]

# ==========================================
# PALABRAS DE DESPEDIDA
# ==========================================
DESPEDIDAS = [
    'gracias', 'thanks', 'muchas gracias',
    'ok gracias', 'listo', 'ya está', 'perfecto',
    'bye', 'adios', 'adiós', 'hasta luego',
    'ahi nos vemos', 'ahí nos vemos', 'chao', 'chau',
    'nos vemos'
]

# ==========================================
# CONFIGURACIÓN DE RESPUESTAS
# ==========================================
MAX_SALONES_MOSTRAR = 10
MAX_CONTEXTO_RECIENTE = 4
MAX_PASOS_PROCESO_COMPLETO = 5