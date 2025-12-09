from django.contrib import admin
from .models import *
class AdministradorAdmin(admin.ModelAdmin):
    # Campos que se mostrarán en la lista del administrador
    list_display = ('nombre', 'correo', 'rol', 'fecha_creacion') 
    # Campos por los que se puede buscar
    search_fields = ('nombre', 'correo', 'rol')
    # Filtros laterales
    list_filter = ('rol', 'fecha_creacion')

# 2. Registra el modelo y la clase Admin
admin.site.register(Administrador, AdministradorAdmin)
# Register your models here.
