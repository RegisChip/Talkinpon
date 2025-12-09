from rest_framework import serializers
from .models import *

# Serializer simple para recibir los datos de un Requisito para la creación
class RequisitoProcesoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequisitoProceso
        fields = ['descripcion']

# Serializer simple para recibir los datos de un Paso para la creación
class PasoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paso
        fields = ['iden', 'actividad', 'tiempo_estimado']

# REEMPLAZAR tu PasoSerializer actual por este:
class PasoSerializer(serializers.ModelSerializer):
    requisitos_count = serializers.SerializerMethodField()
    responsables_nombres = serializers.SerializerMethodField()
    responsables_data = serializers.SerializerMethodField()
    
    class Meta:
        model = Paso
        fields = [
            'id', 'iden', 'actividad', 'tiempo_estimado', 'proceso',
            'requisitos_count', 'responsables_nombres', 'responsables_data'
        ]
    
    def get_requisitos_count(self, obj):
        return obj.requisitos.count()
    
    def get_responsables_nombres(self, obj):
        return [pr.entidad.nombre for pr in obj.responsables.all()]
    
    def get_responsables_data(self, obj):
        return [
            {'id': pr.id, 'nombre': pr.entidad.nombre}
            for pr in obj.responsables.all()
        ]


class ProcesosRequisitosSerializer(serializers.ModelSerializer):
    # Devuelve solo la descripción del requisito vinculado
    descripcion = serializers.CharField(source='requisito.descripcion', read_only=True)
    
    class Meta:
        model = ProcesosRequisitos
        fields = ['descripcion']

class ProcesosSerializer(serializers.ModelSerializer):

    requisitos_nombres = serializers.SerializerMethodField()
    pasos = PasoSerializer(many=True, read_only=True) 


    requisitos_data = RequisitoProcesoWriteSerializer(many=True, write_only=True, required=False)
    pasos_data = PasoWriteSerializer(many=True, write_only=True, required=False)
    
    class Meta:
        model = Procesos
        fields = [
            'id', 
            'nombre', 
            'descripcion', 
            'pasos',
            'requisitos_nombres', 
            'requisitos_data', 
            'pasos_data'
        ]
        read_only_fields = ['id', 'pasos', 'requisitos_nombres']
    
    def get_requisitos_nombres(self, obj):
        
        requisitos_qs = obj.procesosrequisitos_set.all() 
        
        return [req.requisito.descripcion for req in requisitos_qs]
    
    # Lógica para guardar el Proceso y todas sus RELACIONES
    def create(self, validated_data):
        requisitos_data = validated_data.pop('requisitos_data', [])
        pasos_data = validated_data.pop('pasos_data', [])
        proceso = Procesos.objects.create(**validated_data)
        
        for req_data in requisitos_data:

            req_serializer = RequisitoProcesoWriteSerializer(data=req_data)
            req_serializer.is_valid(raise_exception=True)

            requisito = req_serializer.save()

            ProcesosRequisitos.objects.create(proceso=proceso, requisito=requisito)
            
        #  Crear los Pasos
        for paso_data in pasos_data:
            paso_serializer = PasoWriteSerializer(data=paso_data)
            paso_serializer.is_valid(raise_exception=True)
            # Crea el Paso, vinculándolo automáticamente al proceso (ForeignKey)
            paso_serializer.save(proceso=proceso)

        return proceso

    # Lógica para la edición
    def update(self, instance, validated_data):
  
        instance.nombre = validated_data.get('nombre', instance.nombre)
        instance.descripcion = validated_data.get('descripcion', instance.descripcion)
        
        # Guardar la instancia
        instance.save()
        
        return instance
    
# ============== AGREGAR ESTOS SERIALIZERS AL FINAL ==============

# Serializer para RequisitoPaso
class RequisitoPasoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequisitoPaso
        fields = ['id', 'descripcion', 'paso']


# Serializer para EntidadResponsable
class EntidadResponsableSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntidadResponsable
        fields = ['id', 'nombre']


# Serializer para PasoResponsable
class PasoResponsableSerializer(serializers.ModelSerializer):
    entidad_nombre = serializers.CharField(source='entidad.nombre', read_only=True)
    
    class Meta:
        model = PasoResponsable
        fields = ['id', 'paso', 'entidad', 'entidad_nombre']