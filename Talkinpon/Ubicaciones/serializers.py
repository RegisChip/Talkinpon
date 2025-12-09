# Ubicaciones/serializers.py
from rest_framework import serializers
from .models import TipoArea, AreaEdificio, Salon, Edificio, Ubicacion, RelacionU


# 1. Serializer para TipoArea
class TipoAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoArea
        fields = ['id_tipo', 'nombre']
        read_only_fields = ['id_tipo']


# 2. Serializer para AreaEdificio
class AreaEdificioSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='tipo.nombre', read_only=True)
    edificio_nombre = serializers.CharField(source='edificio.nombre', read_only=True)
    
    class Meta:
        model = AreaEdificio
        fields = ['id_area', 'edificio', 'edificio_nombre', 'tipo', 'tipo_nombre', 'nombre']
        read_only_fields = ['id_area', 'tipo_nombre', 'edificio_nombre']


# 3. Serializer para Salon
class SalonSerializer(serializers.ModelSerializer):
    nombre_edificio = serializers.SerializerMethodField()
    
    class Meta:
        model = Salon
        fields = ['id_salon', 'numero', 'capacidad', 'tipo', 'edificio', 'nombre_edificio']
        read_only_fields = ['id_salon', 'nombre_edificio']

    def get_nombre_edificio(self, obj):
        return obj.edificio.nombre


# 4. Serializer para Edificio (lectura/listado)
class EdificioSerializer(serializers.ModelSerializer):
    # Incluir la posición (coordenadas) del nodo Ubicacion
    pos_x = serializers.SerializerMethodField()
    pos_y = serializers.SerializerMethodField()
    nom_nodo = serializers.SerializerMethodField()
    salones_list = SalonSerializer(source='salones', many=True, read_only=True)
    areas_list = AreaEdificioSerializer(source='areas', many=True, read_only=True)
    nombre_especial = serializers.CharField(allow_blank=True, allow_null=True, required=False)

    class Meta:
        model = Edificio
        fields = [
            'id_edificio', 'nombre', 'nombre_especial', 'uso', 'num_salones',
            'pos_x', 'pos_y', 'nom_nodo', 'salones_list', 'areas_list', 'ubicacion'
        ]
        read_only_fields = ['id_edificio', 'pos_x', 'pos_y', 'nom_nodo']

    def get_pos_x(self, obj):
        return float(obj.ubicacion.pos_x)

    def get_pos_y(self, obj):
        return float(obj.ubicacion.pos_y)
    
    def get_nom_nodo(self, obj):
        return obj.ubicacion.nom_nodo


# 5. Serializer de Escritura (Crea Ubicacion y Edificio en una sola POST)
class EdificioWriteSerializer(serializers.ModelSerializer):
    # Campos de Ubicacion que recibimos directamente en el JSON
    pos_x = serializers.FloatField(write_only=True)
    pos_y = serializers.FloatField(write_only=True)
    nombre_especial = serializers.CharField(allow_blank=True, allow_null=True, required=False)

    class Meta:
        model = Edificio
        fields = ['id_edificio', 'nombre', 'nombre_especial', 'uso', 'num_salones', 'pos_x', 'pos_y']
        read_only_fields = ['id_edificio']

    def create(self, validated_data):
        # Extraer datos del nodo Ubicacion
        pos_x = validated_data.pop('pos_x')
        pos_y = validated_data.pop('pos_y')

        # Crear la Ubicacion (nodo) primero
        ubicacion = Ubicacion.objects.create(
            pos_x=pos_x,
            pos_y=pos_y,
            tipo='edificio'
        )

        # Crear el Edificio, vinculándolo a la Ubicacion
        edificio = Edificio.objects.create(ubicacion=ubicacion, **validated_data)
        return edificio

    def update(self, instance, validated_data):
        # Actualizar Edificio (campos directos)
        instance.nombre = validated_data.get('nombre', instance.nombre)
        instance.nombre_especial = validated_data.get('nombre_especial', instance.nombre_especial)
        instance.uso = validated_data.get('uso', instance.uso)
        instance.num_salones = validated_data.get('num_salones', instance.num_salones)
        instance.save()

        # Actualizar Ubicacion (coordenadas) si vienen en validated_data
        if 'pos_x' in validated_data or 'pos_y' in validated_data:
            ubicacion = instance.ubicacion
            ubicacion.pos_x = validated_data.get('pos_x', ubicacion.pos_x)
            ubicacion.pos_y = validated_data.get('pos_y', ubicacion.pos_y)
            ubicacion.save()

        return instance


# 6. Serializer para Ubicacion (nodos del mapa)
class UbicacionSerializer(serializers.ModelSerializer):
    edificio_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Ubicacion
        fields = ['id_ubicacion', 'nom_nodo', 'pos_x', 'pos_y', 'tipo', 'edificio_nombre', 'created_at']
        read_only_fields = ['id_ubicacion', 'nom_nodo', 'created_at', 'edificio_nombre']
    
    def get_edificio_nombre(self, obj):
        """Retorna el nombre del edificio si este nodo es un edificio"""
        if obj.tipo == 'edificio':
            edificio = obj.edificios.first()
            return edificio.nombre if edificio else None
        return None


# 7. Serializer para RelacionU (conexiones entre nodos)
class RelacionUSerializer(serializers.ModelSerializer):
    origen_nombre = serializers.CharField(source='origen.nom_nodo', read_only=True)
    destino_nombre = serializers.CharField(source='destino.nom_nodo', read_only=True)
    
    class Meta:
        model = RelacionU
        fields = [
            'id', 'origen', 'destino', 'origen_nombre', 'destino_nombre',
            'distancia', 'peso', 'bidireccional'
        ]
        read_only_fields = ['id', 'distancia', 'origen_nombre', 'destino_nombre']
    
    def validate(self, data):
        """Validar que no se conecten dos edificios directamente"""
        origen = data.get('origen')
        destino = data.get('destino')
        
        if origen and destino:
            if origen.tipo == 'edificio' and destino.tipo == 'edificio':
                raise serializers.ValidationError(
                    "No se puede conectar directamente dos edificios. "
                    "Usa un nodo intermedio."
                )
            
            if origen.id_ubicacion == destino.id_ubicacion:
                raise serializers.ValidationError(
                    "El origen y destino no pueden ser el mismo nodo."
                )
        
        return data


# 8. Serializer simplificado para React (solo lo necesario para el mapa)
class EdificioMapaSerializer(serializers.ModelSerializer):
    """Serializer ligero para el mapa interactivo de React"""
    id = serializers.IntegerField(source='id_edificio', read_only=True)
    nombre_edificio = serializers.CharField(source='nombre', read_only=True)
    pos_x = serializers.FloatField(source='ubicacion.pos_x', read_only=True)
    pos_y = serializers.FloatField(source='ubicacion.pos_y', read_only=True)
    nom_nodo = serializers.CharField(source='ubicacion.nom_nodo', read_only=True)
    tipo = serializers.CharField(source='ubicacion.tipo', read_only=True)
    
    class Meta:
        model = Edificio
        fields = [
            'id', 'nombre_edificio', 'nombre_especial', 'pos_x', 'pos_y', 
            'nom_nodo', 'tipo', 'uso', 'num_salones'
        ]