from django.urls import path
from .views import *

urlpatterns = [
    # Rutas existentes
    path('', ProcesosListCreateAPIView.as_view(), name='proceso-list-create'),
    path('<int:pk>/', ProcesosDetailAPIView.as_view(), name='proceso-detail'),
    path('pasos/', PasoListCreateAPIView.as_view(), name='paso-list-create'),
    path('pasos/<int:pk>/', PasoDetailAPIView.as_view(), name='paso-detail'),
    
    # ============== NUEVAS RUTAS - AGREGAR ESTAS ==============
    path('requisitos-paso/', RequisitoPasoListCreateAPIView.as_view(), name='requisito-paso-list-create'),
    path('requisitos-paso/<int:pk>/', RequisitoPasoDetailAPIView.as_view(), name='requisito-paso-detail'),
    path('entidades/', EntidadResponsableListCreateAPIView.as_view(), name='entidad-list-create'),
    path('entidades/<int:pk>/', EntidadResponsableDetailAPIView.as_view(), name='entidad-detail'),
    path('paso-responsable/', PasoResponsableListCreateAPIView.as_view(), name='paso-responsable-list-create'),
    path('paso-responsable/<int:pk>/', PasoResponsableDetailAPIView.as_view(), name='paso-responsable-detail'),
]