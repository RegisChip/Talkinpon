"""
URL configuration for talkinpon project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('Chat.urls')), # Asi, Django sabra que url vandar a React
    path('api/administradores/', include('Administrador.urls')),
    path('api/procesos/', include('Procesos.urls')),
    path('', include('Chat.urls')), # solo prueba de que el modelos responde
    path('', include('Ubicaciones.urls')),  # Esto incluye /api/edificios/ y /ruta/dijkstra/
]

# Servir archivos media solo en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    
# Ahora Django servirá archivos desde:
# http://localhost:8000/media/imagenes/AG.jpg
# http://localhost:8000/media/imagenes/C.jpg
# etc.
