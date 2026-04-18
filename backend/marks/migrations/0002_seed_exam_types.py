# Generated manually — seed ExamType rows.

from django.db import migrations

EXAM_SLUGS = ('UNIT_TEST', 'MID_SEM', 'SEMESTER')


def seed_exam_types(apps, schema_editor):
    ExamTypeM = apps.get_model('marks', 'ExamType')
    for slug in EXAM_SLUGS:
        ExamTypeM.objects.get_or_create(slug=slug)


def unseed(apps, schema_editor):
    ExamTypeM = apps.get_model('marks', 'ExamType')
    ExamTypeM.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('marks', '0001_sms_advanced_layer'),
    ]

    operations = [
        migrations.RunPython(seed_exam_types, unseed),
    ]
