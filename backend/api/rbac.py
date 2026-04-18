"""
Role-based access control for SMS.

Roles: principal, vice_principal, class_teacher, subject_teacher.
Enforcement is server-side only; JWT may carry role claims for UI hints.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import QuerySet

User = get_user_model()

ROLE_PRINCIPAL = 'principal'
ROLE_VICE_PRINCIPAL = 'vice_principal'
ROLE_CLASS_TEACHER = 'class_teacher'
ROLE_SUBJECT_TEACHER = 'subject_teacher'

ROLE_CHOICES = (
    (ROLE_PRINCIPAL, 'Principal'),
    (ROLE_VICE_PRINCIPAL, 'Vice Principal'),
    (ROLE_CLASS_TEACHER, 'Class Teacher'),
    (ROLE_SUBJECT_TEACHER, 'Subject Teacher'),
)


def get_profile(user):
    if not user or not user.is_authenticated:
        return None
    try:
        return user.profile
    except Exception:
        return None


def user_is_privileged(user) -> bool:
    """Principal, Vice Principal, or Django superuser."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    p = get_profile(user)
    if not p:
        return False
    return p.role in (ROLE_PRINCIPAL, ROLE_VICE_PRINCIPAL)


def user_can_manage_teachers(user) -> bool:
    return user_is_privileged(user)


def subject_teacher_cannot_access_attendance(user) -> bool:
    p = get_profile(user)
    return bool(p and p.role == ROLE_SUBJECT_TEACHER)


def filter_student_queryset_for_user(queryset: QuerySet, user) -> QuerySet:
    if user_is_privileged(user):
        return queryset
    p = get_profile(user)
    if not p:
        return queryset.none()
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip():
        return queryset.filter(student_class=p.assigned_class.strip())
    if p.role == ROLE_SUBJECT_TEACHER and p.assigned_subject_id:
        from marks.models import Marks

        student_ids = (
            Marks.objects.filter(subject_id=p.assigned_subject_id)
            .values_list('student_id', flat=True)
            .distinct()
        )
        return queryset.filter(id__in=student_ids)
    return queryset.none()


def filter_attendance_queryset_for_user(qs: QuerySet, user) -> QuerySet:
    if user_is_privileged(user):
        return qs
    p = get_profile(user)
    if not p:
        return qs.none()
    if subject_teacher_cannot_access_attendance(user):
        return qs.none()
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip():
        return qs.filter(student__student_class=p.assigned_class.strip())
    return qs.none()


def filter_marks_queryset_for_user(qs: QuerySet, user) -> QuerySet:
    if user_is_privileged(user):
        return qs
    p = get_profile(user)
    if not p:
        return qs.none()
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip():
        return qs.filter(student__student_class=p.assigned_class.strip())
    if p.role == ROLE_SUBJECT_TEACHER and p.assigned_subject_id:
        return qs.filter(subject_id=p.assigned_subject_id)
    return qs.none()


def user_can_access_class(user, class_name: str) -> bool:
    cn = (class_name or '').strip()
    if not cn:
        return False
    if user_is_privileged(user):
        return True
    p = get_profile(user)
    if not p:
        return False
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip() == cn:
        return True
    if p.role == ROLE_SUBJECT_TEACHER:
        # May view results only if class has at least one student with a mark in their subject
        from marks.models import Marks

        return Marks.objects.filter(
            subject_id=p.assigned_subject_id, student__student_class=cn
        ).exists()
    return False


def user_can_access_student(user, student) -> bool:
    from api.models import Student

    return filter_student_queryset_for_user(
        Student.objects.filter(pk=student.pk),
        user,
    ).exists()


def user_can_access_class_results(user, class_name: str) -> bool:
    """Class-scoped exam results: not available to subject-only teachers."""
    cn = (class_name or '').strip()
    if not cn:
        return False
    if user_is_privileged(user):
        return True
    p = get_profile(user)
    if p and p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip() == cn:
        return True
    return False


def user_can_edit_student_record(user, student) -> bool:
    if user_is_privileged(user):
        return True
    p = get_profile(user)
    if not p:
        return False
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip() == str(
        student.student_class or ''
    ).strip():
        return True
    return False


def user_sees_limited_student_detail(user) -> bool:
    p = get_profile(user)
    return bool(p and p.role == ROLE_SUBJECT_TEACHER)


def profile_to_claims(profile) -> dict:
    if not profile:
        return {
            'role': ROLE_PRINCIPAL,
            'assigned_class': '',
            'assigned_subject_id': None,
        }
    return {
        'role': profile.role,
        'assigned_class': (profile.assigned_class or '').strip(),
        'assigned_subject_id': profile.assigned_subject_id,
    }
