from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Attendance(models.Model):
    """One record per student per calendar day."""

    class Status(models.TextChoices):
        PRESENT = 'PRESENT', 'Present'
        ABSENT = 'ABSENT', 'Absent'
        LEAVE = 'LEAVE', 'Leave'

    student = models.ForeignKey(
        'api.Student',
        on_delete=models.CASCADE,
        related_name='attendance_entries',
    )
    date = models.DateField()
    status = models.CharField(max_length=10, choices=Status.choices)
    reason = models.TextField(blank=True, default='')
    marked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_marked',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-id']
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'date'],
                name='uniq_attendance_student_date_v2',
            )
        ]

    def __str__(self):
        return f'{self.student_id} {self.date} {self.status}'

    def clean(self):
        st = self.status
        r = (self.reason or '').strip()
        if st in (self.Status.ABSENT, self.Status.LEAVE):
            if not r:
                raise ValidationError({'reason': 'Reason is required for Absent or Leave.'})
        elif st == self.Status.PRESENT:
            if r:
                raise ValidationError({'reason': 'Reason must be empty when status is Present.'})
