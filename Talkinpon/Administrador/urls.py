from django.urls import path
from .views import *

urlpatterns = [
    path('', ListUsuarios.as_view(), name="Usuarios-registrados"),
    path('registro/', RegistroAdministrador.as_view(), name="registro"),
    path('login/', LoginAdmin.as_view(), name="Login"),
    path('<int:pk>/', DeleteAdmin.as_view(), name="delete-admi"),
]