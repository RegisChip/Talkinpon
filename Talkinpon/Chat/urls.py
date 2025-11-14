# Talkinpon/Chat/urls.py

from django.urls import path
from . import views

'''urlpatterns = [
    path("chat/ubicaciones/", views.chat_ubicaciones, name="chat_ubicaciones"),
    path("chat/procesos/", views.chat_procesos, name="chat_procesos"),
]'''

urlpatterns = [
    path("", views.chat_ollama, name="chat_ollama"),
    path("chat/", views.chat_front, name="chat_api")
]
