from django.core.exceptions import ValidationError
from django.db import models

from .exam_totals import total_marks_for_exam_type


class Subject(models.Model):
    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class ExamType(models.Model):
    """Fixed exam categories (seeded)."""

    class Name(models.TextChoices):
        UNIT_TEST = 'UNIT_TEST', 'Unit Test'
        MID_SEM = 'MID_SEM', 'Mid Sem'
        SEMESTER = 'SEMESTER', 'Semester'

    slug = models.CharField(max_length=20, choices=Name.choices, unique=True)

    class Meta:
        ordering = ['slug']

    def __str__(self):
        return self.get_slug_display()


class Marks(models.Model):
    """Normalized exam marks for a student."""

    student = models.ForeignKey(
        'api.Student',
        on_delete=models.CASCADE,
        related_name='structured_marks',
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='marks_rows',
    )
    exam_type = models.ForeignKey(
        ExamType,
        on_delete=models.PROTECT,
        related_name='marks_rows',
    )
    marks_obtained = models.FloatField()
    total_marks = models.FloatField()
    exam_date = models.DateField()

    class Meta:
        ordering = ['-exam_date', '-id']
        indexes = [
            models.Index(fields=['student', 'exam_type']),
            models.Index(fields=['student', 'subject']),
        ]

    def __str__(self):
        return f'{self.student_id} {self.subject} {self.exam_type}'

    def clean(self):
        if not self.exam_type_id:
            raise ValidationError({'exam_type': 'This field is required.'})
        self.total_marks = total_marks_for_exam_type(self.exam_type)
        if self.marks_obtained is not None and self.total_marks is not None:
            if self.marks_obtained > self.total_marks:
                raise ValidationError(
                    {
                        'marks_obtained': (
                            f'Marks obtained cannot exceed {self.total_marks:g} for this exam type.'
                        )
                    }
                )
            if self.marks_obtained < 0:
                raise ValidationError({'marks_obtained': 'Marks obtained cannot be negative.'})

    def save(self, *args, **kwargs):
        if self.exam_type_id:
            self.total_marks = total_marks_for_exam_type(self.exam_type)
        self.full_clean()
        super().save(*args, **kwargs)
