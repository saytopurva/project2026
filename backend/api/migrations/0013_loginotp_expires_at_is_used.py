from datetime import timedelta

from django.db import migrations, models


def forwards_fill_expires_and_rename(apps, schema_editor):
    LoginOTP = apps.get_model('api', 'LoginOTP')
    for row in LoginOTP.objects.all():
        row.expires_at = row.created_at + timedelta(minutes=5)
        row.save(update_fields=['expires_at'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_userprofile_approval_status_alter_activitylog_action_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='loginotp',
            old_name='is_verified',
            new_name='is_used',
        ),
        migrations.AddField(
            model_name='loginotp',
            name='expires_at',
            field=models.DateTimeField(
                db_index=True,
                help_text='After this time the code is invalid.',
                null=True,
            ),
        ),
        migrations.RunPython(forwards_fill_expires_and_rename, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='loginotp',
            name='expires_at',
            field=models.DateTimeField(
                db_index=True,
                help_text='After this time the code is invalid.',
            ),
        ),
    ]
