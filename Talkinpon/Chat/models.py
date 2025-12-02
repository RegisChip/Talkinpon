# Talkinpon/Chat/models.py

from django.db import models
from django.utils import timezone
from datetime import timedelta
import uuid

# Create your models here.

class Consulta(models.Model):
    """
    Tabla permanente que registra cada conversación completa.
    NO SE BORRA, es historial.
    """
    MODULO_CHOICES = [
        ('PROCESOS', 'Procesos'),
        ('UBICACIONES', 'Ubicaciones'),
        ('GENERAL', 'General'),
    ]

    session_id = models.UUIDField(db_index=True, default= uuid.uuid4) # Varias consultas pueden tener el mismo session_id
    modulo_consulta = models.CharField(max_length=45, choices=MODULO_CHOICES)
    tipo_consulta = models.CharField(max_length=100) # "Ej: Procesos-Paso-Servicio Social"
    fecha = models.DateTimeField(default=timezone.now)
    
    class Meta:
        verbose_name = "Consulta"
        verbose_name_plural = "Consultas"
        ordering = ['-fecha']
    
    def __str__(self):
        return f"{self.modulo_consulta} - {self.tipo_consulta} ({self.fecha.strftime('%Y-%m-%d %H:%M')})"
    

class Contexto(models.Model):
    """
    Tabla temporal para mantener el contexto de la conversación activa.
    SE BORRA cuando el usuario sale del chat.
    """
    ROLE_CHOICES = [
        ('USER', 'Usuario'),
        ('ASSISTANT', 'Asistente'),
    ]
    
    session_id = models.UUIDField(db_index=True, default= uuid.uuid4) # Varias entradas pueden tener el mismo session_id
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    contenido = models.TextField()
    fecha = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        verbose_name = "Contexto"
        verbose_name_plural = "Contextos"
        ordering = ['fecha']
    
    def __str__(self):
        return f"{self.role} - {self.session_id} - {self.fecha.strftime('%H:%M:%S')}"