from django.db import models
from django.utils import timezone
import uuid

# Create your models here.

class Consulta(models.Model):
    MODULO_CHOICES = [
        ('PROCESOS', 'Procesos'),
        ('UBICACIONES', 'Ubicaciones'),
    ]

    modulo_consulta = models.CharField(max_length=45, choices=MODULO_CHOICES)
    tipo_consulta = models.CharField(max_length=45) # Puede que necesite modificaciones para una mejor manera de ingresar el tipo de consulta
    fecha = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.modulo_consulta} - {self.tipo_consulta}"


class Contexto(models.Model):
    ROLE_CHOICES = [
        ('USER', 'Usuario'),
        ('ASSISTANT', 'Asistente'),
    ]

    session_id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    contenido = models.TextField()
    fecha = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.role} - {self.session_id}"
