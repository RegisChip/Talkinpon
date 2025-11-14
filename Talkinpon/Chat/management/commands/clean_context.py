# Chat/management/commands/clean_context.py
"""
Comando para limpiar contextos antiguos
Ejecutar manualmente: python manage.py clean_context
O programar con cron/celery para ejecutar cada 5 minutos
"""
from django.core.management.base import BaseCommand
from Chat.models import Contexto


class Command(BaseCommand):
    help = 'Elimina contextos de chat más antiguos de 5 minutos'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--minutes',
            type=int,
            default=5,
            help='Minutos de antigüedad para eliminar contextos (default: 5)'
        )
    
    def handle(self, *args, **options):
        minutos = options['minutes']
        cantidad = Contexto.limpiar_contextos_antiguos(minutos=minutos)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'✓ Se eliminaron {cantidad} contextos más antiguos de {minutos} minutos'
            )
        )