from django.contrib import admin
from .models import Edificio, Salon, Ubicacion

admin.site.register(Ubicacion)
admin.site.register(Edificio)
admin.site.register(Salon)

# Register your models here.
