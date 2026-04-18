# Align Marks.total_marks with fixed caps per exam type.

from django.db import migrations

MAP = {
    'UNIT_TEST': 20.0,
    'MID_SEM': 50.0,
    'SEMESTER': 100.0,
}


def forwards(apps, schema_editor):
    Marks = apps.get_model('marks', 'Marks')
    for m in Marks.objects.select_related('exam_type').iterator():
        slug = m.exam_type.slug
        cap = MAP.get(slug)
        if cap is not None and float(m.total_marks) != cap:
            m.total_marks = cap
            m.save(update_fields=['total_marks'])


class Migration(migrations.Migration):

    dependencies = [
        ('marks', '0003_subject_unique_seed_predefined'),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
