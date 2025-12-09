from django.db import models
from django.contrib.auth.hashers import make_password, check_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError

class RolChoices(models.TextChoices):
    PROCESOS = 'PROCESOS', 'Administrador de Procesos'
    UBICACIONES = 'UBICACIONES', 'Administrador de Ubicaciones'
    SUPERADMINISTRADOR = 'SUPER', "Super administrador"


class Administrador(models.Model):
    nombre = models.CharField(max_length=60)
    correo = models.EmailField(max_length=100, unique=True)
    contrasena = models.CharField(max_length=128)  # Guarda el hash, no texto plano
    rol = models.CharField(
        max_length=15,
        choices=RolChoices.choices,
        default=RolChoices.PROCESOS,
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nombre} ({self.get_rol_display()})"
    
    def clean(self):
        if self.rol == RolChoices.SUPERADMINISTRADOR:
            # Busca si ya existe un SUPERADMINISTRADOR, excluyendo al usuario actual (self.pk)
            if Administrador.objects.filter(rol=RolChoices.SUPERADMINISTRADOR).exclude(pk=self.pk).exists():
                raise ValidationError({
                    'rol': "Ya existe un Super Administrador en el sistema. Solo se permite uno."
                })
        super().clean()
    
    def save(self, *args, **kwargs):
        try:
            self.full_clean()
        except ValidationError as e:
            if 'rol' in e.message_dict:
                raise IntegrityError(e.message_dict['rol'][0]) from e
            else:
                raise e
        
        super().save(*args, **kwargs)

    # Métodos de seguridad para contraseñas
    def set_contrasena(self, raw_password):
        self.contrasena = make_password(raw_password)

    def verificar_contrasena(self, raw_password):
        return check_password(raw_password, self.contrasena)
