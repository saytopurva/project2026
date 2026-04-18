# Subject.name unique + predefined school subjects.

from django.db import migrations, models


PREDEFINED_SUBJECTS = (
    'Maths',
    'Science',
    'English',
    'Marathi',
    'French',
    'Hindi',
    'German',
)


def dedupe_subjects(apps, schema_editor):
    Subject = apps.get_model('marks', 'Subject')
    Marks = apps.get_model('marks', 'Marks')
    from collections import defaultdict

    groups = defaultdict(list)
    for s in Subject.objects.all().order_by('id'):
        key = (s.name or '').strip().lower()
        if not key:
            key = f'__empty_{s.pk}'
        groups[key].append(s.pk)

    for _key, ids in groups.items():
        if len(ids) <= 1:
            continue
        keep = min(ids)
        for dup_id in ids:
            if dup_id == keep:
                continue
            Marks.objects.filter(subject_id=dup_id).update(subject_id=keep)
            Subject.objects.filter(pk=dup_id).delete()


def seed_predefined(apps, schema_editor):
    Subject = apps.get_model('marks', 'Subject')
    for name in PREDEFINED_SUBJECTS:
        Subject.objects.get_or_create(name=name)


class Migration(migrations.Migration):

    dependencies = [
        ('marks', '0002_seed_exam_types'),
    ]

    operations = [
        migrations.RunPython(dedupe_subjects, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='subject',
            name='name',
            field=models.CharField(max_length=120, unique=True),
        ),
        migrations.RunPython(seed_predefined, migrations.RunPython.noop),
    ]
