# Ubicaciones/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, viewsets

# Router para Django REST Framework
router = DefaultRouter()
router.register(r'tipos-area', viewsets.TipoAreaViewSet, basename='tipoarea')
router.register(r'areas', viewsets.AreaEdificioViewSet, basename='area')
router.register(r'salones', viewsets.SalonViewSet, basename='salon')
router.register(r'edificios', viewsets.EdificioViewSet, basename='edificio')
router.register(r'ubicaciones', viewsets.UbicacionViewSet, basename='ubicacion')
router.register(r'relaciones', viewsets.RelacionUViewSet, basename='relacion')

app_name = 'ubicaciones'

urlpatterns = [
    # ==================== VISTAS NORMALES (Django Templates) ====================
    # Editor de mapa (admin)
    path('mapa/', views.mapa, name='mapa'),
    path('guardar_ubicacion/', views.guardar_ubicacion, name='guardar_ubicacion'),
    
    # Mapa interactivo (React)
    path('api/ubicaciones/datos-mapa/', views.datos_mapa, name='datos_mapa'),
    path('api/ubicaciones/crear-nodo/', views.crear_nodo, name='crear_nodo'),
    path('api/ubicaciones/crear-relacion/', views.crear_relacion, name='crear_relacion'),
    path('api/ubicaciones/eliminar-nodo/', views.eliminar_nodo, name='eliminar_nodo'),
    path('api/ubicaciones/eliminar-relacion/', views.eliminar_relacion, name='eliminar_relacion'),
    
    
    # API JSON (endpoints legacy para compatibilidad)
    path('api/edificios/', views.obtener_edificios_json, name='obtener_edificios_json'),
    path('ruta/dijkstra/', views.dijkstra_ruta, name='dijkstra_ruta'),
    
    # ==================== API REST FRAMEWORK ====================
    # Incluir todas las rutas del router
    # Esto genera automáticamente:
    # - GET    /api/rest/edificios/          -> Lista
    # - POST   /api/rest/edificios/          -> Crear
    # - GET    /api/rest/edificios/{id}/     -> Detalle
    # - PUT    /api/rest/edificios/{id}/     -> Actualizar completo
    # - PATCH  /api/rest/edificios/{id}/     -> Actualizar parcial
    # - DELETE /api/rest/edificios/{id}/     -> Eliminar
    # - GET    /api/rest/edificios/mapa/     -> Custom action (lista para React)
    path('api/rest/', include(router.urls)),
]

# URLs generadas por el router:
"""
TIPOS DE ÁREA:
- GET    /api/rest/tipos-area/
- POST   /api/rest/tipos-area/
- GET    /api/rest/tipos-area/{id}/
- PUT    /api/rest/tipos-area/{id}/
- PATCH  /api/rest/tipos-area/{id}/
- DELETE /api/rest/tipos-area/{id}/

ÁREAS DE EDIFICIO:
- GET    /api/rest/areas/
- GET    /api/rest/areas/?edificio=1  (filtrar por edificio)
- POST   /api/rest/areas/
- GET    /api/rest/areas/{id}/
- PUT    /api/rest/areas/{id}/
- PATCH  /api/rest/areas/{id}/
- DELETE /api/rest/areas/{id}/

SALONES:
- GET    /api/rest/salones/
- GET    /api/rest/salones/?edificio=1  (filtrar por edificio)
- POST   /api/rest/salones/
- GET    /api/rest/salones/{id}/
- PUT    /api/rest/salones/{id}/
- PATCH  /api/rest/salones/{id}/
- DELETE /api/rest/salones/{id}/

EDIFICIOS:
- GET    /api/rest/edificios/                    (lista completa)
- GET    /api/rest/edificios/mapa/               (lista simplificada para React)
- GET    /api/rest/edificios/{id}/               (detalle)
- GET    /api/rest/edificios/{id}/detalle_completo/  (detalle con todo)
- POST   /api/rest/edificios/                    (crear con pos_x, pos_y)
- PUT    /api/rest/edificios/{id}/               (actualizar)
- PATCH  /api/rest/edificios/{id}/               (actualizar parcial)
- DELETE /api/rest/edificios/{id}/               (eliminar)

UBICACIONES (nodos):
- GET    /api/rest/ubicaciones/
- GET    /api/rest/ubicaciones/?tipo=intermedio  (filtrar por tipo)
- GET    /api/rest/ubicaciones/intermedios/      (solo nodos intermedios)
- POST   /api/rest/ubicaciones/
- GET    /api/rest/ubicaciones/{id}/
- PUT    /api/rest/ubicaciones/{id}/
- PATCH  /api/rest/ubicaciones/{id}/
- DELETE /api/rest/ubicaciones/{id}/

RELACIONES (conexiones):
- GET    /api/rest/relaciones/
- GET    /api/rest/relaciones/desde_origen/?origen_id=1  (desde un nodo)
- POST   /api/rest/relaciones/                          (crear relación)
- POST   /api/rest/relaciones/crear_bidireccional/      (crear bidireccional)
- GET    /api/rest/relaciones/{id}/
- PUT    /api/rest/relaciones/{id}/
- PATCH  /api/rest/relaciones/{id}/
- DELETE /api/rest/relaciones/{id}/
"""