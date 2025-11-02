from django.urls import path
from . import views

urlpatterns = [
    path('', views.mapa, name='mapa'),
    path('guardar/', views.guardar_ubicacion, name='guardar_ubicacion'),
]
