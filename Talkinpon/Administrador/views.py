from django.shortcuts import render
from rest_framework import generics, views, response, status
from rest_framework.permissions import AllowAny
from .models import *
from .serializers import *

class RegistroAdministrador(generics.CreateAPIView):
    queryset = Administrador.objects.all()
    serializer_class = AdministradorSerializer
    permission_classes = [AllowAny]

class ListUsuarios(generics.ListAPIView):
    queryset = Administrador.objects.all()
    serializer_class = AdministradorSerializer
    permission_classes = [AllowAny]

class LoginAdmin(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = Login(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']

        return response.Response({
            'success': True,
            'id': user.id,
            'nombre': user.nombre,
            'correo': user.correo,
            'rol': user.rol
        }, status=status.HTTP_200_OK)

class DeleteAdmin(generics.RetrieveUpdateDestroyAPIView):
    queryset = Administrador.objects.all()
    serializer_class = AdministradorSerializer
    permission_classes = [AllowAny]
    lookup_field = 'pk'

# Create your views here.
