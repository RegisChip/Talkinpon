from rest_framework import serializers
from django.db import IntegrityError
from .models import *

# Serializer simple para recibir los datos de un Requisito para la creación
class RequisitoProcesoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequisitoProceso
        fields = ['descripcion']
        read_only_fields = ('id',)

# Serializer simple para recibir los datos de un Paso para la creación
class PasoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paso
        fields = ['id', 'iden', 'actividad', 'tiempo_estimado', 'proceso']
        read_only_fields = ('id',)

# Serializer para lectura de Paso
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
        read_only_fields = ['id']
    
    def get_requisitos_nombres(self, obj):
        requisitos_qs = obj.procesosrequisitos_set.all() 
        return [req.requisito.descripcion for req in requisitos_qs]
    
    # ==========================================
    # MÉTODO CREATE - Para crear nuevos procesos
    # ==========================================
    def create(self, validated_data):
        print("\n" + "=" * 80)
        print("🔍 CREATE - INICIO")
        print("=" * 80)
        print("validated_data recibido:", validated_data)
        
        requisitos_data = validated_data.pop('requisitos_data', [])
        pasos_data = validated_data.pop('pasos_data', [])

        print(f"\n📋 requisitos_data extraído: {requisitos_data}")
        print(f"📋 pasos_data extraído: {pasos_data}")
        
        # 🔒 Blindaje total
        validated_data.pop('id', None)

        # Crear el Proceso
        proceso = Procesos.objects.create(**validated_data)
        print(f"\n✅ Proceso creado: ID={proceso.id}, Nombre={proceso.nombre}")

        # ======================
        # Crear / Vincular Requisitos
        # ======================
        print(f"\n🔄 Procesando {len(requisitos_data)} requisitos...")
        
        for idx, req_data in enumerate(requisitos_data, 1):
            print(f"\n--- Requisito {idx}/{len(requisitos_data)} ---")
            print(f"Datos: {req_data}")
            
            req_data.pop('id', None)  # 🔒 Eliminar ID si viene

            # ✅ Crear/obtener requisito en tabla Procesos_requisitoproceso
            from django.db import connection
            
            try:
                with connection.cursor() as cursor:
                    # Verificar si existe el requisito
                    cursor.execute("""
                        SELECT id FROM "Procesos_requisitoproceso"
                        WHERE descripcion = %s
                    """, [req_data['descripcion']])
                    
                    existing_req = cursor.fetchone()
                    
                    if existing_req:
                        requisito_id = existing_req[0]
                        print(f"  ℹ️ Requisito existente: ID={requisito_id}")
                    else:
                        # Insertar nuevo requisito
                        cursor.execute("""
                            INSERT INTO "Procesos_requisitoproceso" (descripcion)
                            VALUES (%s)
                            RETURNING id
                        """, [req_data['descripcion']])
                        
                        requisito_id = cursor.fetchone()[0]
                        print(f"  ✅ Requisito creado: ID={requisito_id}")
                        
            except Exception as e:
                print(f"  ❌ ERROR al crear requisito: {e}")
                continue

            # Crear la relación en tabla Procesos_procesosrequisitos
            print(f"\n  🔗 INTENTANDO CREAR RELACIÓN:")
            print(f"     - Proceso ID: {proceso.id} (tipo: {type(proceso.id)})")
            print(f"     - Requisito ID: {requisito_id} (tipo: {type(requisito_id)})")
            
            try:
                with connection.cursor() as cursor:
                    # Verificar si ya existe la relación
                    print(f"     - Verificando si existe la relación...")
                    cursor.execute("""
                        SELECT id FROM "Procesos_procesosrequisitos"
                        WHERE proceso_id = %s AND requisito_id = %s
                    """, [proceso.id, requisito_id])
                    
                    existing_rel = cursor.fetchone()
                    
                    if existing_rel:
                        print(f"  ℹ️ Relación ya existía: ID={existing_rel[0]}")
                    else:
                        print(f"     - No existe, insertando nueva relación (usando DEFAULT para id)...")
                        
                        # Insertar SIN especificar ID - PostgreSQL usará el sequence
                        cursor.execute("""
                            INSERT INTO "Procesos_procesosrequisitos" (proceso_id, requisito_id)
                            VALUES (%s, %s)
                            RETURNING id
                        """, [proceso.id, requisito_id])
                        
                        rel_id = cursor.fetchone()[0]
                        print(f"  ✅ Relación CREADA: ID={rel_id}")
                        
            except Exception as e:
                import traceback
                print(f"  ❌ ERROR al crear relación: {e}")
                print(f"  ⚠️ Tipo de error: {type(e).__name__}")
                print(f"  📋 Traceback completo:")
                traceback.print_exc()
                    # No re-lanzar para evitar romper todo el flujo

        # Verificar cuántas relaciones se crearon
        total_relaciones = proceso.procesosrequisitos_set.count()
        print(f"\n📊 Total de relaciones creadas: {total_relaciones}")
        
        # Verificar que las relaciones existen
        print("\n🔍 Verificando relaciones en BD:")
        for rel in proceso.procesosrequisitos_set.all():
            print(f"  - Relación ID={rel.id}: Proceso={rel.proceso_id} → Requisito={rel.requisito_id} ({rel.requisito.descripcion})")

        # ======================
        # Crear Pasos
        # ======================
        print(f"\n🔄 Procesando {len(pasos_data)} pasos...")
        for paso_data in pasos_data:
            paso_data.pop('id', None)  # 🔒

            try:
                paso, paso_created = Paso.objects.get_or_create(
                    proceso=proceso,
                    iden=paso_data['iden'],
                    defaults={
                        'actividad': paso_data['actividad'],
                        'tiempo_estimado': paso_data['tiempo_estimado'],
                    }
                )
                if paso_created:
                    print(f"  ✅ Paso creado: {paso.iden}")
                else:
                    print(f"  ℹ️ Paso ya existía: {paso.iden}")
            except IntegrityError as e:
                print(f"  ⚠️ Error al crear paso: {e}")

        print("\n" + "=" * 80)
        print("🔍 CREATE - FIN")
        print("=" * 80 + "\n")
        
        return proceso


    # ==========================================
    # MÉTODO UPDATE - Para actualizar procesos
    # ==========================================
    def update(self, instance, validated_data):
        print("\n" + "=" * 80)
        print("🔍 UPDATE - INICIO")
        print("=" * 80)
        print(f"Instance: ID={instance.id}, Nombre={instance.nombre}")
        print("validated_data recibido:", validated_data)
        
        requisitos_data = validated_data.pop('requisitos_data', None)
        pasos_data = validated_data.pop('pasos_data', None)
        
        print(f"\n📋 requisitos_data extraído: {requisitos_data}")
        
        # Actualizar campos básicos del proceso
        instance.nombre = validated_data.get('nombre', instance.nombre)
        instance.descripcion = validated_data.get('descripcion', instance.descripcion)
        instance.save()
        
        print(f"✅ Proceso actualizado: {instance.nombre}")
        
        # ======================
        # Actualizar Requisitos
        # ======================
        if requisitos_data is not None:
            print(f"\n🔄 Actualizando requisitos...")
            
            # 1. Eliminar relaciones anteriores
            relaciones_anteriores = instance.procesosrequisitos_set.count()
            print(f"🗑️ Eliminando {relaciones_anteriores} relaciones anteriores...")
            instance.procesosrequisitos_set.all().delete()
            
            # 2. Crear nuevos requisitos
            print(f"➕ Creando {len(requisitos_data)} nuevas relaciones...")
            
            for idx, req_data in enumerate(requisitos_data, 1):
                print(f"\n--- Requisito {idx}/{len(requisitos_data)} ---")
                print(f"Datos: {req_data}")
                
                req_data.pop('id', None)
                
                # ✅ Crear/obtener requisito en tabla Procesos_requisitoproceso
                from django.db import connection
                
                try:
                    with connection.cursor() as cursor:
                        # Verificar si existe el requisito
                        cursor.execute("""
                            SELECT id FROM "Procesos_requisitoproceso"
                            WHERE descripcion = %s
                        """, [req_data['descripcion']])
                        
                        existing_req = cursor.fetchone()
                        
                        if existing_req:
                            requisito_id = existing_req[0]
                            print(f"  ℹ️ Requisito existente: ID={requisito_id}")
                        else:
                            # Insertar nuevo requisito
                            cursor.execute("""
                                INSERT INTO "Procesos_requisitoproceso" (descripcion)
                                VALUES (%s)
                                RETURNING id
                            """, [req_data['descripcion']])
                            
                            requisito_id = cursor.fetchone()[0]
                            print(f"  ✅ Requisito creado: ID={requisito_id}")
                            
                except Exception as e:
                    print(f"  ❌ ERROR al crear requisito: {e}")
                    continue
                
                # Crear la relación en tabla Procesos_procesosrequisitos
                print(f"\n  🔗 INTENTANDO CREAR RELACIÓN:")
                print(f"     - Proceso ID: {instance.id} (tipo: {type(instance.id)})")
                print(f"     - Requisito ID: {requisito_id} (tipo: {type(requisito_id)})")
                
                try:
                    with connection.cursor() as cursor:
                        # Verificar si ya existe la relación
                        print(f"     - Verificando si existe la relación...")
                        cursor.execute("""
                            SELECT id FROM "Procesos_procesosrequisitos"
                            WHERE proceso_id = %s AND requisito_id = %s
                        """, [instance.id, requisito_id])
                        
                        existing_rel = cursor.fetchone()
                        
                        if existing_rel:
                            print(f"  ℹ️ Relación ya existía: ID={existing_rel[0]}")
                        else:
                            print(f"     - No existe, insertando nueva relación (usando DEFAULT para id)...")
                            
                            # Insertar SIN especificar ID - PostgreSQL usará el sequence
                            cursor.execute("""
                                INSERT INTO "Procesos_procesosrequisitos" (proceso_id, requisito_id)
                                VALUES (%s, %s)
                                RETURNING id
                            """, [instance.id, requisito_id])
                            
                            rel_id = cursor.fetchone()[0]
                            print(f"  ✅ Relación CREADA: ID={rel_id}")
                            
                except Exception as e:
                    import traceback
                    print(f"  ❌ ERROR al crear relación: {e}")
                    print(f"  ⚠️ Tipo de error: {type(e).__name__}")
                    print(f"  📋 Traceback completo:")
                    traceback.print_exc()
            
            # Verificar cuántas relaciones quedaron
            relaciones_finales = instance.procesosrequisitos_set.count()
            print(f"\n📊 Total de relaciones después de actualizar: {relaciones_finales}")
            
            # Verificar que las relaciones existen
            print("\n🔍 Verificando relaciones en BD:")
            for rel in instance.procesosrequisitos_set.all():
                print(f"  - Relación ID={rel.id}: Proceso={rel.proceso_id} → Requisito={rel.requisito_id} ({rel.requisito.descripcion})")
        else:
            print("⚠️ requisitos_data es None, no se actualizarán requisitos")
        
        # ======================
        # Actualizar Pasos (si se envían)
        # ======================
        if pasos_data is not None:
            print(f"\n🔄 Actualizando pasos...")
            # Aquí podrías implementar lógica similar si necesitas actualizar pasos
            print("⚠️ Actualización de pasos no implementada en este método")
        
        print("\n" + "=" * 80)
        print("🔍 UPDATE - FIN")
        print("=" * 80 + "\n")
        
        return instance

# ============== SERIALIZERS ADICIONALES ==============

class RequisitoPasoSerializer(serializers.ModelSerializer):
    class Meta:
        model = RequisitoPaso
        fields = ['id', 'descripcion', 'paso']


class EntidadResponsableSerializer(serializers.ModelSerializer):
    class Meta:
        model = EntidadResponsable
        fields = ['id', 'nombre']


class PasoResponsableSerializer(serializers.ModelSerializer):
    entidad_nombre = serializers.CharField(source='entidad.nombre', read_only=True)
    
    class Meta:
        model = PasoResponsable
        fields = ['id', 'paso', 'entidad', 'entidad_nombre']