# Generated manually — move Attendance to `attendance` app.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_sms_advanced_layer'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Attendance',
        ),
    ]
