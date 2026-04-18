"""
Audit DB connectivity and SMS tables. Run: python manage.py verify_database
"""

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


# App labels and model names that must exist after migrations
EXPECTED = (
    ('api', 'Student'),
    ('attendance', 'Attendance'),
    ('marks', 'Subject'),
    ('marks', 'ExamType'),
    ('marks', 'Marks'),
)


class Command(BaseCommand):
    help = 'Verify database connection and that core SMS tables are queryable.'

    def handle(self, *args, **options):
        try:
            connection.ensure_connection()
        except Exception as e:
            raise CommandError(f'Database connection failed: {e}') from e

        cfg = connection.settings_dict
        engine = cfg.get('ENGINE', '')
        name = cfg.get('NAME', '')
        self.stdout.write(self.style.SUCCESS('Connection: OK'))
        self.stdout.write(f'  ENGINE: {engine}')
        self.stdout.write(f'  NAME:   {name}')

        for app_label, model_name in EXPECTED:
            try:
                Model = apps.get_model(app_label, model_name)
            except LookupError as e:
                raise CommandError(f'Model not registered: {app_label}.{model_name} ({e})') from e
            try:
                n = Model.objects.count()
            except Exception as e:
                raise CommandError(f'Query failed for {app_label}.{model_name}: {e}') from e
            self.stdout.write(f'  {app_label}.{model_name}: {n} row(s)')

        self.stdout.write(self.style.SUCCESS('Database status: Working'))
