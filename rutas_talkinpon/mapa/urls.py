from django.urls import path
from . import views

urlpatterns = [
    path('', views.mapa, name='mapa'),
    path('guardar/', views.guardar_ubicacion, name='guardar_ubicacion'),
    path('mapa-interactivo/', views.mapa_interactivo, name='mapa_interactivo'),
    path('ruta/dijkstra/', views.dijkstra_ruta, name='dijkstra_ruta'),

]
