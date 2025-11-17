from django.db import models
import math
import string

class Ubicacion(models.Model):
    """Representa un nodo en el mapa (edificio o punto intermedio)"""
    id_ubicacion = models.AutoField(primary_key=True)
    nom_nodo = models.CharField(max_length=45, unique=True, blank=True, null=True)
    pos_x = models.FloatField()
    pos_y = models.FloatField()
    
    TIPO_NODO_CHOICES = [
        ('edificio', 'Edificio'),
        ('intermedio', 'Punto Intermedio'),
    ]
    tipo = models.CharField(max_length=20, choices=TIPO_NODO_CHOICES, default='intermedio')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'ubicacion'
        ordering = ['nom_nodo']

    def save(self, *args, **kwargs):
        if not self.nom_nodo or self.nom_nodo.strip() == "":
            letras = list(string.ascii_lowercase)
            existentes = list(
                Ubicacion.objects.exclude(nom_nodo__isnull=True).values_list('nom_nodo', flat=True)
            )
            existentes = [n.lower() for n in existentes]

            # Generar siguiente nombre único
            def siguiente_nombre(existentes):
                # Letras simples
                for letra in letras:
                    if letra not in existentes:
                        return letra
                # Combinaciones de dos letras
                for l1 in letras:
                    for l2 in letras:
                        posible = l1 + l2
                        if posible not in existentes:
                            return posible
                # Combinaciones con más letras si es necesario
                i = 1
                while True:
                    posible = f"n{i}"
                    if posible not in existentes:
                        return posible
                    i += 1

            self.nom_nodo = siguiente_nombre(existentes)

        # Asegurarse de que no sea None antes de lower()
        if self.nom_nodo:
            self.nom_nodo = self.nom_nodo.lower()
        else:
            # Esto nunca debería pasar, pero por seguridad
            self.nom_nodo = "nodo"

        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.nom_nodo} ({self.pos_x}, {self.pos_y}) - {self.tipo}"


class Edificio(models.Model):
    """Información de edificios"""
    id_edificio = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=45, unique=True)
    uso = models.CharField(max_length=500, blank=True)
    num_salones = models.IntegerField(default=0)
    carreras = models.CharField(max_length=150, blank=True, null=True)
    ubicacion = models.ForeignKey(Ubicacion, on_delete=models.CASCADE, related_name='edificios')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'edificio'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class RelacionU(models.Model):
    """Conexiones entre ubicaciones"""
    origen = models.ForeignKey(Ubicacion, on_delete=models.CASCADE, related_name='conexiones_salida')
    destino = models.ForeignKey(Ubicacion, on_delete=models.CASCADE, related_name='conexiones_entrada')
    distancia = models.FloatField(null=True, blank=True)
    peso = models.FloatField(null=True, blank=True)
    bidireccional = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'relacion_u'
        unique_together = ('origen', 'destino')
    
    def save(self, *args, **kwargs):
        dx = self.destino.pos_x - self.origen.pos_x
        dy = self.destino.pos_y - self.origen.pos_y
        distancia_calculada = math.sqrt(dx**2 + dy**2)
        if not self.distancia:
            self.distancia = distancia_calculada
        if not self.peso:
            self.peso = distancia_calculada
        super().save(*args, **kwargs)

        # Crear inversa
        if self.bidireccional:
            RelacionU.objects.get_or_create(
                origen=self.destino,
                destino=self.origen,
                defaults={'distancia': self.distancia, 'peso': self.peso, 'bidireccional': False}
            )

    def __str__(self):
        return f"{self.origen.nom_nodo} → {self.destino.nom_nodo} (dist={self.distancia:.2f})"
    
class Salon(models.Model):
    """Salones dentro de edificios"""
    id_salon = models.AutoField(primary_key=True)
    numero = models.CharField(max_length=20)
    edificio = models.ForeignKey(Edificio, on_delete=models.CASCADE, related_name='salones')
    capacidad = models.IntegerField(default=30)
    tipo = models.CharField(max_length=50, blank=True, null=True)  # laboratorio, aula, etc.
    
    class Meta:
        db_table = 'salon'
        ordering = ['edificio', 'numero']
    
    def __str__(self):
        return f"Salón {self.numero} - {self.edificio.nombre}"