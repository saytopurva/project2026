from django.conf import settings
from django.db import models


class Student(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField()
    parent_email = models.EmailField(blank=True, default='')
    parent_phone = models.CharField(max_length=30, blank=True, default='')
    student_class = models.CharField(max_length=20)
    roll_no = models.IntegerField()
    photo = models.ImageField(upload_to='student_photos/%Y/%m/', blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, default='')
    phone_number = models.CharField(max_length=30, blank=True, default='')
    address = models.TextField(blank=True, default='')
    division = models.CharField(max_length=40, blank=True, default='')
    height = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return self.name


class ParentDetails(models.Model):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='parents')
    mother_name = models.CharField(max_length=120, blank=True, default='')
    father_name = models.CharField(max_length=120, blank=True, default='')
    parents_phone = models.CharField(max_length=30, blank=True, default='')
    parents_occupation = models.CharField(max_length=200, blank=True, default='')

    def __str__(self):
        return f'Parents: {self.student.name}'


class AcademicDetails(models.Model):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='academic')
    attendance_percentage = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    overall_result = models.CharField(max_length=50, blank=True, default='')
    semester = models.CharField(max_length=50, blank=True, default='')
    performance = models.TextField(blank=True, default='')
    creativity = models.TextField(blank=True, default='')
    teacher_remarks = models.TextField(blank=True, default='')

    def __str__(self):
        return f'Academic: {self.student.name}'


class FeesDetails(models.Model):
    student = models.OneToOneField(Student, on_delete=models.CASCADE, related_name='fees')
    fees_paid = models.BooleanField(default=False)
    amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    payment_date = models.DateField(blank=True, null=True)

    def __str__(self):
        return f'Fees: {self.student.name}'


class Certificate(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='certificates')
    title = models.CharField(max_length=200)
    year = models.PositiveIntegerField(blank=True, null=True)
    file = models.FileField(upload_to='student_certificates/%Y/%m/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year', '-created_at', '-id']

    def __str__(self):
        return f'{self.title} ({self.student.name})'


class Notice(models.Model):
    """School-wide notice posted by a staff user (JWT-authenticated)."""

    title = models.CharField(max_length=200)
    content = models.TextField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notices',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_important = models.BooleanField(default=False)
    attachment = models.FileField(
        upload_to='notice_attachments/%Y/%m/',
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Event(models.Model):
    class EventType(models.TextChoices):
        EVENT = 'EVENT', 'Event'
        PTM = 'PTM', 'PTM'
        HOLIDAY = 'HOLIDAY', 'Holiday'
        EXAM = 'EXAM', 'Exam'

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    date = models.DateField()
    event_type = models.CharField(
        max_length=20,
        choices=EventType.choices,
        default=EventType.EVENT,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='events',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', '-created_at', '-id']

    def __str__(self):
        return f'{self.title} ({self.date})'


class UserProfile(models.Model):
    """Staff role and scope (assigned class / subject). One-to-one with Django User."""

    class Role(models.TextChoices):
        PRINCIPAL = 'principal', 'Principal'
        VICE_PRINCIPAL = 'vice_principal', 'Vice Principal'
        CLASS_TEACHER = 'class_teacher', 'Class Teacher'
        SUBJECT_TEACHER = 'subject_teacher', 'Subject Teacher'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        default=Role.CLASS_TEACHER,
    )
    assigned_class = models.CharField(
        max_length=40,
        blank=True,
        default='',
        help_text='Exact student_class label for class teachers (e.g. 6, 10A).',
    )
    assigned_subject = models.ForeignKey(
        'marks.Subject',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subject_teachers',
    )

    class Meta:
        verbose_name = 'user profile'

    def __str__(self):
        return f'{self.user} ({self.get_role_display()})'


class ActivityLog(models.Model):
    """Audit trail for marks / attendance changes."""

    class Action(models.TextChoices):
        MARKS_CREATE = 'marks_create', 'Marks create'
        MARKS_UPDATE = 'marks_update', 'Marks update'
        MARKS_DELETE = 'marks_delete', 'Marks delete'
        ATTENDANCE_CREATE = 'attendance_create', 'Attendance create'
        ATTENDANCE_UPDATE = 'attendance_update', 'Attendance update'
        TEACHER_CREATE = 'teacher_create', 'Teacher create'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='activity_logs',
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    target = models.CharField(max_length=200, blank=True, default='')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f'{self.action} by {self.user_id} @ {self.created_at}'
