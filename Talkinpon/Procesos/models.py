# Talkinpon\Talkinpon\Procesos\models.py

from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver

# Create your models here.

class RequisitoProceso(models.Model):
    descripcion = models.TextField()

    def __str__(self):
        return f"Requisito {self.id}"

class Procesos(models.Model):
    nombre = models.CharField(max_length=70)
    descripcion = models.TextField()
    # Relación muchos a muchos con RequisitoProceso
    requisitos = models.ManyToManyField(
        RequisitoProceso,
        through='ProcesosRequisitos',
        related_name='procesos'
    )

    def __str__(self):
        return self.nombre

# Tabla intermedia para la relación muchos a muchos
class ProcesosRequisitos(models.Model):
    proceso = models.ForeignKey(Procesos, on_delete=models.CASCADE)
    requisito = models.ForeignKey(RequisitoProceso, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('proceso', 'requisito')  # Evita duplicados

    def __str__(self):
        return f"{self.requisito.descripcion} → {self.proceso.nombre}"


class Paso(models.Model):
    iden = models.CharField(max_length=45)
    actividad = models.TextField()
    tiempo_estimado = models.CharField(max_length=45)
    proceso = models.ForeignKey(Procesos, on_delete=models.CASCADE, related_name='pasos')

    def __str__(self):
        return self.iden


class RequisitoPaso(models.Model):
    descripcion = models.TextField()
    paso = models.ForeignKey(Paso, on_delete=models.CASCADE, related_name='requisitos')

    def __str__(self):
        return f"Requisito {self.id} de {self.paso.iden}"


class EntidadResponsable(models.Model):
    nombre = models.CharField(max_length=70)

    def __str__(self):
        return self.nombre


class PasoResponsable(models.Model):
    paso = models.ForeignKey(Paso, on_delete=models.CASCADE, related_name='responsables')
    entidad = models.ForeignKey(EntidadResponsable, on_delete=models.CASCADE, related_name='pasos')

    def __str__(self):
        return f"{self.entidad.nombre} - {self.paso.iden}"

@receiver(post_delete, sender=ProcesosRequisitos)
def eliminar_requisito_huerfano(sender, instance, **kwargs):
    """
    Cuando se elimina una relación ProcesosRequisitos,
    verifica si el requisito quedó huérfano (sin ningún proceso asociado)
    y lo elimina automáticamente.
    """
    requisito = instance.requisito
    
    # Verificar si el requisito tiene alguna otra relación con procesos
    if not requisito.procesosrequisitos_set.exists():
        print(f"🗑️ Eliminando requisito huérfano: '{requisito.descripcion}' (ID: {requisito.id})")
        requisito.delete()