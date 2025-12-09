from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import *
from .serializers import *

class ProcesosListCreateAPIView(generics.ListCreateAPIView):
    queryset = Procesos.objects.all()
    serializer_class = ProcesosSerializer
    permission_classes = [AllowAny]

class ProcesosDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Procesos.objects.all()
    serializer_class = ProcesosSerializer
    permission_classes = [AllowAny]
    lookup_field = 'pk'

class PasoListCreateAPIView(generics.ListCreateAPIView):
    # La consulta debe poder filtrar por proceso_id
    queryset = Paso.objects.all()
    serializer_class = PasoSerializer # Usamos el Serializer de Lectura
    permission_classes = [AllowAny]
    
    # Sobreescribir get_queryset para filtrar por proceso_id si se envía
    def get_queryset(self):
        queryset = Paso.objects.all()
        proceso_id = self.request.query_params.get('proceso_id', None)
        if proceso_id is not None:
            queryset = queryset.filter(proceso_id=proceso_id)
        return queryset

    # Usar PasoWriteSerializer para la creación
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PasoWriteSerializer
        return PasoSerializer

class PasoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Paso.objects.all()
    serializer_class = PasoWriteSerializer
    permission_classes = [AllowAny]
    lookup_field = 'pk'
# Create your views here.

# ============== AGREGAR ESTAS VIEWS AL FINAL ==============

class RequisitoPasoListCreateAPIView(generics.ListCreateAPIView):
    queryset = RequisitoPaso.objects.all()
    serializer_class = RequisitoPasoSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = RequisitoPaso.objects.all()
        paso_id = self.request.query_params.get('paso_id', None)
        if paso_id is not None:
            queryset = queryset.filter(paso_id=paso_id)
        return queryset


class RequisitoPasoDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = RequisitoPaso.objects.all()
    serializer_class = RequisitoPasoSerializer
    permission_classes = [AllowAny]
    lookup_field = 'pk'


class EntidadResponsableListCreateAPIView(generics.ListCreateAPIView):
    queryset = EntidadResponsable.objects.all()
    serializer_class = EntidadResponsableSerializer
    permission_classes = [AllowAny]


class EntidadResponsableDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = EntidadResponsable.objects.all()
    serializer_class = EntidadResponsableSerializer
    permission_classes = [AllowAny]
    lookup_field = 'pk'


class PasoResponsableListCreateAPIView(generics.ListCreateAPIView):
    queryset = PasoResponsable.objects.all()
    serializer_class = PasoResponsableSerializer
    permission_classes = [AllowAny]


class PasoResponsableDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PasoResponsable.objects.all()
    serializer_class = PasoResponsableSerializer
    permission_classes = [AllowAny]
    lookup_field = 'pk'