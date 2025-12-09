# Talkinpon\Talkinpon\Ubicaciones\viewsets.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import TipoArea, AreaEdificio, Salon, Edificio, Ubicacion, RelacionU
from .serializers import (
    TipoAreaSerializer,
    AreaEdificioSerializer,
    SalonSerializer,
    EdificioSerializer,
    EdificioWriteSerializer,
    EdificioMapaSerializer,
    UbicacionSerializer,
    RelacionUSerializer
)


class TipoAreaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD de TipoArea
    """
    queryset = TipoArea.objects.all()
    serializer_class = TipoAreaSerializer


class AreaEdificioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD de AreaEdificio
    """
    queryset = AreaEdificio.objects.select_related('edificio', 'tipo').all()
    serializer_class = AreaEdificioSerializer
    
    def get_queryset(self):
        """Permitir filtrar por edificio"""
        queryset = super().get_queryset()
        edificio_id = self.request.query_params.get('edificio', None)
        if edificio_id:
            queryset = queryset.filter(edificio_id=edificio_id)
        return queryset


class SalonViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD de Salon
    """
    queryset = Salon.objects.select_related('edificio').all()
    serializer_class = SalonSerializer
    
    def get_queryset(self):
        """Permitir filtrar por edificio"""
        queryset = super().get_queryset()
        edificio_id = self.request.query_params.get('edificio', None)
        if edificio_id:
            queryset = queryset.filter(edificio_id=edificio_id)
        return queryset


class EdificioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD de Edificio
    
    GET /api/edificios/ - Lista todos los edificios
    GET /api/edificios/{id}/ - Detalle de un edificio
    POST /api/edificios/ - Crear edificio (requiere pos_x, pos_y)
    PUT/PATCH /api/edificios/{id}/ - Actualizar edificio
    DELETE /api/edificios/{id}/ - Eliminar edificio
    GET /api/edificios/mapa/ - Lista simplificada para React
    """
    queryset = Edificio.objects.select_related('ubicacion').prefetch_related(
        'salones', 'areas', 'areas__tipo'
    ).all()
    
    def get_serializer_class(self):
        """Usar serializer diferente según la acción"""
        if self.action in ['create', 'update', 'partial_update']:
            return EdificioWriteSerializer
        elif self.action == 'mapa':
            return EdificioMapaSerializer
        return EdificioSerializer
    
    @action(detail=False, methods=['get'])
    def mapa(self, request):
        """
        Endpoint simplificado para React: GET /api/edificios/mapa/
        Retorna solo los campos necesarios para el mapa interactivo
        """
        edificios = self.get_queryset()
        serializer = EdificioMapaSerializer(edificios, many=True)
        return Response({
            'edificios': serializer.data,
            'total': len(serializer.data)
        })
    
    @action(detail=True, methods=['get'])
    def detalle_completo(self, request, pk=None):
        """
        Endpoint con información completa del edificio
        GET /api/edificios/{id}/detalle_completo/
        """
        edificio = self.get_object()
        serializer = EdificioSerializer(edificio)
        return Response(serializer.data)
    
    def perform_destroy(self, instance):
        """Al eliminar un edificio, también eliminar su ubicación"""
        ubicacion = instance.ubicacion
        instance.delete()
        # Eliminar relaciones asociadas
        RelacionU.objects.filter(Q(origen=ubicacion) | Q(destino=ubicacion)).delete()
        # Eliminar ubicación
        ubicacion.delete()


class UbicacionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD de Ubicacion (nodos del mapa)
    """
    queryset = Ubicacion.objects.all()
    serializer_class = UbicacionSerializer
    
    def get_queryset(self):
        """Permitir filtrar por tipo"""
        queryset = super().get_queryset()
        tipo = self.request.query_params.get('tipo', None)
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        return queryset
    
    @action(detail=False, methods=['get'])
    def intermedios(self, request):
        """
        Obtener solo nodos intermedios (no edificios)
        GET /api/ubicaciones/intermedios/
        """
        nodos = self.queryset.filter(tipo='intermedio')
        serializer = self.get_serializer(nodos, many=True)
        return Response(serializer.data)


class RelacionUViewSet(viewsets.ModelViewSet):
    """
    ViewSet para CRUD de RelacionU (conexiones entre nodos)
    """
    queryset = RelacionU.objects.select_related('origen', 'destino').all()
    serializer_class = RelacionUSerializer
    
    @action(detail=False, methods=['get'])
    def desde_origen(self, request):
        """
        Obtener todas las conexiones desde un origen específico
        GET /api/relaciones/desde_origen/?origen_id=1
        """
        origen_id = request.query_params.get('origen_id', None)
        if not origen_id:
            return Response(
                {'error': 'Se requiere el parámetro origen_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        relaciones = self.queryset.filter(origen_id=origen_id)
        serializer = self.get_serializer(relaciones, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def crear_bidireccional(self, request):
        """
        Crear una relación bidireccional automáticamente
        POST /api/relaciones/crear_bidireccional/
        Body: {"origen": 1, "destino": 2, "peso": 10.5}
        """
        data = request.data.copy()
        data['bidireccional'] = True
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def perform_destroy(self, instance):
        """Al eliminar una relación bidireccional, eliminar también la inversa"""
        if instance.bidireccional:
            RelacionU.objects.filter(
                origen=instance.destino,
                destino=instance.origen,
                bidireccional=False
            ).delete()
        instance.delete()