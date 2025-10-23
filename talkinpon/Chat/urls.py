from django.urls import path
from . import views

urlpatterns = [
    path("chat/ubicaciones/", views.chat_ubicaciones, name="chat_ubicaciones"),
    path("chat/procesos/", views.chat_procesos, name="chat_procesos"),
]
