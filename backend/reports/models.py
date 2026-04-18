from django.db import models


class AttendanceReportSendLog(models.Model):
    class Status(models.TextChoices):
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'

    student = models.ForeignKey(
        'api.Student',
        on_delete=models.CASCADE,
        related_name='attendance_report_sends',
    )
    month = models.PositiveSmallIntegerField()
    year = models.PositiveIntegerField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.SUCCESS)
    error_message = models.TextField(blank=True, default='')
    recipient_email = models.EmailField(blank=True, default='')

    class Meta:
        ordering = ['-sent_at', '-id']

    def __str__(self):
        return f'{self.student_id} {self.year}-{self.month:02d} {self.status}'
