from django.db import models
from django.contrib.auth.hashers import make_password, check_password

# Create your models here.

class RolChoices(models.TextChoices):
    PROCESOS = 'PROCESOS', 'Administrador de Procesos'
    UBICACIONES = 'UBICACIONES', 'Administrador de Ubicaciones'


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

    # Métodos de seguridad para contraseñas
    def set_contrasena(self, raw_password):
        self.contrasena = make_password(raw_password)

    def verificar_contrasena(self, raw_password):
        return check_password(raw_password, self.contrasena)
