from django.urls import path
from .views import *

urlpatterns = [
    path('', ProcesosListCreateAPIView.as_view(), name='proceso-list-create'),
    path('<int:pk>/', ProcesosDetailAPIView.as_view(), name='proceso-detail'),
    path('pasos/', PasoListCreateAPIView.as_view(), name='paso-list-create'),
    path('pasos/<int:pk>/', PasoDetailAPIView.as_view(), name='paso-detail'),
]