from rest_framework import serializers
from .models import *

class AdministradorSerializer(serializers.ModelSerializer):
    contrasena = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Administrador
        fields = ['id', 'nombre', 'correo', 'contrasena', 'rol']  # Elimina 'rol' de read_only_fields

    def validate_rol(self, value):
        # Si el rol que se intenta guardar es SUPERADMINISTRADOR
        if value == RolChoices.SUPERADMINISTRADOR:
            # Verificar si ya existe un administrador con este rol
            if Administrador.objects.filter(rol=RolChoices.SUPERADMINISTRADOR).exists():
                raise serializers.ValidationError(
                    "Ya existe un Super Administrador en el sistema. Solo se permite uno."
                )
        return value

    def create(self, validated_data):
        raw_password = validated_data.pop('contrasena')

        administrador = Administrador(**validated_data)
        administrador.set_contrasena(raw_password)

        administrador.save()

        return administrador

    def update(self, instance, validated_data):
        instance.nombre = validated_data.get('nombre', instance.nombre)
        instance.correo = validated_data.get('correo', instance.correo)
        instance.rol = validated_data.get('rol', instance.rol)
        raw_password = validated_data.get('contrasena')
        if raw_password:
            instance.set_contrasena(raw_password)

        instance.save()

        return instance


class Login(serializers.Serializer):
    correo = serializers.EmailField()
    contrasena = serializers.CharField(write_only = True)

    def validate(self, data):
        correo = data.get('correo')
        contrasena = data.get('contrasena')

        if correo and contrasena:
            try:
                administrador = Administrador.objects.get(correo=correo)
            except Administrador.DoesNotExist:
                raise serializers.ValidationError("Correo o contraseña incorrectos.")
            if not administrador.verificar_contrasena(contrasena):
                raise serializers.ValidationError("Correo o contraseña incorrectos.")
            
            data['user'] = administrador
            return data
        raise serializers.ValidationError("Debe ingresar correo y contraseña.")
