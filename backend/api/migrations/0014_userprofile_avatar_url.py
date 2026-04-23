from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_loginotp_expires_at_is_used'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='avatar_url',
            field=models.URLField(
                blank=True,
                default='',
                help_text='Profile image URL (e.g. from Google Sign-In).',
                max_length=512,
            ),
        ),
    ]
