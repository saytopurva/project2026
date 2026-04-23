from django.conf import settings
from django.db import models


class SchoolClass(models.Model):
    """
    Canonical class catalog for staff assignment (e.g. "5th", "6th", "10A").

    Students still store `student_class` as a string for compatibility; RBAC maps via this label.
    """

    name = models.CharField(max_length=40, unique=True, db_index=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


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


class LoginOTP(models.Model):
    """
    Email login OTP. The `otp` field stores a SHA-256 hex digest of the 6-digit
    code (never store plaintext OTP in the database).
    """

    email = models.EmailField(db_index=True)
    otp = models.CharField(
        max_length=64,
        help_text='SHA-256 hex of the 6-digit code (peppered).',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        db_index=True,
        help_text='After this time the code is invalid.',
    )
    is_used = models.BooleanField(default=False)
    verify_attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', '-created_at']),
        ]

    def __str__(self):
        return f'OTP {self.email} @ {self.created_at}'


class UserProfile(models.Model):
    """Staff role and scope (assigned class / subject). One-to-one with Django User."""

    class Role(models.TextChoices):
        PRINCIPAL = 'principal', 'Principal'
        VICE_PRINCIPAL = 'vice_principal', 'Vice Principal'
        CLASS_TEACHER = 'class_teacher', 'Class Teacher'
        SUBJECT_TEACHER = 'subject_teacher', 'Subject Teacher'
        STAFF = 'staff', 'Staff (Admin)'
        UNASSIGNED = 'unassigned', 'Unassigned'

    class ApprovalStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        default=Role.UNASSIGNED,
    )
    approval_status = models.CharField(
        max_length=16,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        help_text='Self-registered users start pending until Principal/Vice Principal approves.',
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
    assigned_subjects = models.ManyToManyField(
        'marks.Subject',
        blank=True,
        related_name='subject_teachers_many',
        help_text='Advanced: allow one subject teacher to handle multiple subjects.',
    )
    assigned_classes = models.ManyToManyField(
        SchoolClass,
        blank=True,
        related_name='teachers',
        help_text='Classes this staff user can access (for class/subject teachers).',
    )
    avatar_url = models.URLField(
        max_length=512,
        blank=True,
        default='',
        help_text='Profile image URL (e.g. from Google Sign-In).',
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
        USER_CREATE = 'user_create', 'User create'
        USER_APPROVE = 'user_approve', 'User approve'
        USER_REJECT = 'user_reject', 'User reject'
        USER_ROLE_UPDATE = 'user_role_update', 'User role update'

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


# --- Schedule & substitution ---


class ClassSchedule(models.Model):
    """A single timetable slot for a teacher on a day."""

    class Day(models.TextChoices):
        MON = 'MON', 'Mon'
        TUE = 'TUE', 'Tue'
        WED = 'WED', 'Wed'
        THU = 'THU', 'Thu'
        FRI = 'FRI', 'Fri'
        SAT = 'SAT', 'Sat'

    class_name = models.CharField(max_length=40, db_index=True)
    subject = models.ForeignKey(
        'marks.Subject',
        on_delete=models.PROTECT,
        related_name='schedule_slots',
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='class_schedule_slots',
    )
    day = models.CharField(max_length=3, choices=Day.choices, db_index=True)
    start_time = models.TimeField(db_index=True)
    end_time = models.TimeField(db_index=True)

    class Meta:
        ordering = ['day', 'start_time', 'end_time', 'class_name', 'id']
        indexes = [
            models.Index(fields=['teacher', 'day', 'start_time']),
            models.Index(fields=['day', 'start_time', 'end_time']),
        ]

    def __str__(self):
        return f'{self.class_name} {self.subject} {self.day} {self.start_time}-{self.end_time}'


class Substitution(models.Model):
    """When an original teacher is absent for a slot; someone must be assigned."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ASSIGNED = 'ASSIGNED', 'Assigned'

    date = models.DateField(db_index=True)
    class_name = models.CharField(max_length=40, db_index=True)
    subject = models.ForeignKey(
        'marks.Subject',
        on_delete=models.PROTECT,
        related_name='substitutions',
    )
    original_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='substitutions_as_original',
    )
    substitute_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='substitutions_as_substitute',
    )
    start_time = models.TimeField(db_index=True)
    end_time = models.TimeField(db_index=True)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', 'start_time', 'class_name', 'id']
        indexes = [
            models.Index(fields=['date', 'status']),
            models.Index(fields=['date', 'start_time']),
        ]

    def __str__(self):
        return f'{self.date} {self.class_name} {self.subject} ({self.status})'
