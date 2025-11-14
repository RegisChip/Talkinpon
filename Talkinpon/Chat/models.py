# Talkinpon\Chat\models.py

from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid

# Create your models here.

class Consulta(models.Model):
    MODULO_CHOICES = [
        ('PROCESOS', 'Procesos'),
        ('UBICACIONES', 'Ubicaciones'),
    ]
    
    modulo_consulta = models.CharField(max_length=45, choices=MODULO_CHOICES)
    tipo_consulta = models.CharField(max_length=100)  # Ej: "Procesos-Completo", "Ubicaciones-Edificio"
    fecha = models.DateTimeField(default=timezone.now)
    
    class Meta:
        verbose_name = "Consulta"
        verbose_name_plural = "Consultas"
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.modulo_consulta} - {self.tipo_consulta} ({self.fecha.strftime('%Y-%m-%d %H:%M')})"

class Contexto(models.Model):
    ROLE_CHOICES = [
        ('USER', 'Usuario'),
        ('ASSISTANT', 'Asistente'),
    ]
    
    session_id = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    contenido = models.TextField()
    fecha = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        verbose_name = "Contexto"
        verbose_name_plural = "Contextos"
        ordering = ['fecha']
    
    def __str__(self):
        return f"{self.role} - {self.session_id} - {self.fecha.strftime('%H:%M:%S')}"
    
    '''@classmethod
    def limpiar_contextos_antiguos(cls, minutos=5):
        """
        Elimina contextos más antiguos de X minutos
        Llamar desde un comando de gestión o tarea programada
        """
        tiempo_limite = timezone.now() - timedelta(minutes=minutos)
        contextos_antiguos = cls.objects.filter(fecha__lt=tiempo_limite)
        cantidad = contextos_antiguos.count()
        contextos_antiguos.delete()
        return cantidad'''