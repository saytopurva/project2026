# Generated manually — migrate boolean status to choice field + new columns

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.utils import timezone


def forwards_status(apps, schema_editor):
    Attendance = apps.get_model('api', 'Attendance')
    User = apps.get_model(settings.AUTH_USER_MODEL)
    first_user = User.objects.order_by('id').first()
    now = timezone.now()
    for row in Attendance.objects.all():
        old_bool = row.status_old
        row.status = 'PRESENT' if old_bool else 'ABSENT'
        row.created_at = now
        if first_user:
            row.marked_by_id = first_user.id
        row.save(update_fields=['status', 'created_at', 'marked_by_id'])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('api', '0004_student_address_student_division_student_dob_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='attendance',
            old_name='status',
            new_name='status_old',
        ),
        migrations.AddField(
            model_name='attendance',
            name='status',
            field=models.CharField(
                choices=[
                    ('PRESENT', 'Present'),
                    ('ABSENT', 'Absent'),
                    ('LEAVE', 'Leave'),
                ],
                default='PRESENT',
                max_length=10,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='attendance',
            name='leave_reason',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='attendance',
            name='marked_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='marked_attendance',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='attendance',
            name='created_at',
            field=models.DateTimeField(default=timezone.now),
            preserve_default=False,
        ),
        migrations.RunPython(forwards_status, noop_reverse),
        migrations.RemoveField(
            model_name='attendance',
            name='status_old',
        ),
        migrations.AlterField(
            model_name='attendance',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True),
        ),
        migrations.AlterField(
            model_name='attendance',
            name='student',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='attendance_records',
                to='api.student',
            ),
        ),
        migrations.AddConstraint(
            model_name='attendance',
            constraint=models.UniqueConstraint(
                fields=('student', 'date'),
                name='uniq_attendance_student_date',
            ),
        ),
    ]
