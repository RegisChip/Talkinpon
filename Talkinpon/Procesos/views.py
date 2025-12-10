from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import *
from .serializers import (
    ProcesosSerializer,
    PasoSerializer,
    PasoWriteSerializer,
    RequisitoPasoSerializer,
    EntidadResponsableSerializer,
    PasoResponsableSerializer,
)


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
    queryset = Paso.objects.all()
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = Paso.objects.all()
        proceso_id = self.request.query_params.get('proceso_id', None)
        if proceso_id is not None:
            queryset = queryset.filter(proceso_id=proceso_id)
        return queryset

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PasoWriteSerializer
        return PasoSerializer
    
    # ✅ AGREGAR ESTE MÉTODO
    def perform_create(self, serializer):
        # Debug: imprimir lo que llega
        print("=" * 50)
        print("Datos recibidos en perform_create:")
        print("request.data:", self.request.data)
        print("serializer.validated_data:", serializer.validated_data)
        print("=" * 50)
        
        # Validar que proceso esté presente
        if 'proceso' not in serializer.validated_data or not serializer.validated_data['proceso']:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"proceso": "El campo proceso es obligatorio."})
        
        serializer.save()

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