# Talkinpon\Talkinpon\Ubicaciones\models.py

from django.db import models

# Create your models here.

class Ubicacion(models.Model):
    nombre_nodo = models.CharField(max_length=45)
    pos_x = models.FloatField()
    pos_y = models.FloatField()

    def __str__(self):
        return self.nombre_nodo


class Edificio(models.Model):
    nombre = models.CharField(max_length=100)
    uso = models.CharField(max_length=500)
    num_salones = models.PositiveIntegerField()
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.CASCADE, related_name='edificios')

    def __str__(self):
        return self.nombre


class Salon(models.Model):
    numero = models.CharField(max_length=10)
    piso = models.CharField(max_length=20)
    capacidad = models.PositiveIntegerField()
    edificio = models.ForeignKey(Edificio, on_delete=models.CASCADE, related_name='salones')

    def __str__(self):
        return f"Salón {self.numero} ({self.edificio.nombre})"


class Imagen(models.Model):
    imagen = models.BinaryField()
    edificio = models.ForeignKey(Edificio, on_delete=models.CASCADE, null=True, blank=True, related_name='imagenes')
    salon = models.ForeignKey(Salon, on_delete=models.CASCADE, null=True, blank=True, related_name='imagenes')

    def __str__(self):
        target = self.edificio.nombre if self.edificio else (f"Salón {self.salon.numero}" if self.salon else "Sin ubicación")
        return f"Imagen {self.id} - {target}"


class RelacionU(models.Model):
    origen = models.ForeignKey(Ubicacion, on_delete=models.CASCADE, related_name='relaciones_origen')
    destino = models.ForeignKey(Ubicacion, on_delete=models.CASCADE, related_name='relaciones_destino')

    class Meta:
        unique_together = ('origen', 'destino')  # Evita relaciones duplicadas

    def __str__(self):
        return f"{self.origen.nombre_nodo} → {self.destino.nombre_nodo}"
