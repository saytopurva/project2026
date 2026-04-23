"""
Role-based access control for SMS.

Enforcement is server-side only. Roles are never taken from the client without verification.
"""

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db.models import QuerySet

from .models import UserProfile

User = get_user_model()

ROLE_PRINCIPAL = UserProfile.Role.PRINCIPAL
ROLE_VICE_PRINCIPAL = UserProfile.Role.VICE_PRINCIPAL
ROLE_CLASS_TEACHER = UserProfile.Role.CLASS_TEACHER
ROLE_SUBJECT_TEACHER = UserProfile.Role.SUBJECT_TEACHER
ROLE_STAFF = UserProfile.Role.STAFF
ROLE_UNASSIGNED = UserProfile.Role.UNASSIGNED


def get_profile(user):
    if not user or not user.is_authenticated:
        return None
    try:
        return user.profile
    except Exception:
        return None


def _profile_allowed_subject_ids(p: UserProfile) -> set[int]:
    """
    Subject-teacher scope:
    - Prefer `assigned_subjects` when configured
    - Otherwise fall back to legacy `assigned_subject`
    """
    if not p:
        return set()
    ids = set()
    try:
        # ManyToMany exists after migrations; guard for older DBs during rollout.
        for sid in p.assigned_subjects.values_list('id', flat=True):
            if sid:
                ids.add(int(sid))
    except Exception:
        pass
    if not ids and getattr(p, 'assigned_subject_id', None):
        ids.add(int(p.assigned_subject_id))
    return ids


def _profile_allowed_class_names(p: UserProfile) -> list[str]:
    """
    Class scope:
    - Use M2M `assigned_classes` when configured
    - Otherwise fall back to legacy `assigned_class` string
    """
    if not p:
        return []
    names: list[str] = []
    try:
        names = [
            str(n).strip()
            for n in p.assigned_classes.values_list('name', flat=True)
            if str(n).strip()
        ]
    except Exception:
        names = []
    if not names:
        single = (getattr(p, 'assigned_class', '') or '').strip()
        if single:
            names = [single]
    # De-dup while preserving order
    out = []
    seen = set()
    for n in names:
        if n not in seen:
            out.append(n)
            seen.add(n)
    return out


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


def user_has_operational_access(user) -> bool:
    """Use app features (not only /api/me/). Pending self-signups are blocked."""
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    p = get_profile(user)
    if not p:
        return False
    if p.approval_status == UserProfile.ApprovalStatus.REJECTED:
        return False
    if (
        p.approval_status == UserProfile.ApprovalStatus.PENDING
        and p.role == ROLE_UNASSIGNED
    ):
        return False
    if p.role == ROLE_UNASSIGNED:
        return False
    return True


def subject_teacher_cannot_access_attendance(user) -> bool:
    p = get_profile(user)
    return bool(p and p.role == ROLE_SUBJECT_TEACHER)


def filter_student_queryset_for_user(queryset: QuerySet, user) -> QuerySet:
    if user_is_privileged(user):
        return queryset
    p = get_profile(user)
    if not p or not user_has_operational_access(user):
        return queryset.none()
    if p.role == ROLE_STAFF:
        return queryset
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip():
        classes = _profile_allowed_class_names(p)
        return queryset.filter(student_class__in=classes) if classes else queryset.none()
    if p.role == ROLE_SUBJECT_TEACHER:
        classes = _profile_allowed_class_names(p)
        # For subject teachers: roster is class-scoped (not "only students with existing marks").
        return queryset.filter(student_class__in=classes) if classes else queryset.none()
    return queryset.none()


def filter_attendance_queryset_for_user(qs: QuerySet, user) -> QuerySet:
    if user_is_privileged(user):
        return qs
    p = get_profile(user)
    if not p or not user_has_operational_access(user):
        return qs.none()
    if p.role == ROLE_STAFF:
        return qs
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip():
        classes = _profile_allowed_class_names(p)
        return qs.filter(student__student_class__in=classes) if classes else qs.none()
    if p.role == ROLE_SUBJECT_TEACHER:
        # Read-only access is enforced in views; queryset should still be class-scoped.
        classes = _profile_allowed_class_names(p)
        return qs.filter(student__student_class__in=classes) if classes else qs.none()
    return qs.none()


def filter_marks_queryset_for_user(qs: QuerySet, user) -> QuerySet:
    if user_is_privileged(user):
        return qs
    p = get_profile(user)
    if not p or not user_has_operational_access(user):
        return qs.none()
    if p.role == ROLE_STAFF:
        return qs
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip():
        classes = _profile_allowed_class_names(p)
        return qs.filter(student__student_class__in=classes) if classes else qs.none()
    if p.role == ROLE_SUBJECT_TEACHER:
        subject_ids = _profile_allowed_subject_ids(p)
        if not subject_ids:
            return qs.none()
        out = qs.filter(subject_id__in=list(subject_ids))
        classes = _profile_allowed_class_names(p)
        if classes:
            out = out.filter(student__student_class__in=classes)
        else:
            out = out.none()
        return out
    return qs.none()


def user_can_access_class(user, class_name: str) -> bool:
    cn = (class_name or '').strip()
    if not cn:
        return False
    if user_is_privileged(user):
        return True
    p = get_profile(user)
    if not p or not user_has_operational_access(user):
        return False
    if p.role == ROLE_STAFF:
        return True
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip() == cn:
        return True
    if p.role == ROLE_CLASS_TEACHER:
        classes = _profile_allowed_class_names(p)
        return bool(classes and cn in classes)
    if p.role == ROLE_SUBJECT_TEACHER:
        classes = _profile_allowed_class_names(p)
        return bool(classes and cn in classes)
    return False


def user_can_access_student(user, student) -> bool:
    from api.models import Student

    return filter_student_queryset_for_user(
        Student.objects.filter(pk=student.pk),
        user,
    ).exists()


def user_can_access_class_results(user, class_name: str) -> bool:
    cn = (class_name or '').strip()
    if not cn:
        return False
    if user_is_privileged(user):
        return True
    p = get_profile(user)
    if not p or not user_has_operational_access(user):
        return False
    if p.role == ROLE_STAFF:
        return True
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip() == cn:
        return True
    if p.role == ROLE_CLASS_TEACHER:
        classes = _profile_allowed_class_names(p)
        return bool(classes and cn in classes)
    return False


def user_can_edit_student_record(user, student) -> bool:
    if user_is_privileged(user):
        return True
    p = get_profile(user)
    if not p or not user_has_operational_access(user):
        return False
    if p.role == ROLE_STAFF:
        return False
    if p.role == ROLE_CLASS_TEACHER and (p.assigned_class or '').strip() == str(
        student.student_class or ''
    ).strip():
        return True
    if p.role == ROLE_CLASS_TEACHER:
        classes = _profile_allowed_class_names(p)
        return bool(classes and str(student.student_class or '').strip() in classes)
    return False


def user_sees_limited_student_detail(user) -> bool:
    p = get_profile(user)
    return bool(p and p.role == ROLE_SUBJECT_TEACHER)


def profile_to_claims(profile) -> dict:
    if not profile:
        return {
            'role': ROLE_UNASSIGNED,
            'assigned_class': '',
            'assigned_classes': [],
            'assigned_subject_id': None,
            'assigned_subject_ids': [],
            'approval_status': UserProfile.ApprovalStatus.PENDING,
        }
    subject_ids = sorted(_profile_allowed_subject_ids(profile))
    return {
        'role': profile.role,
        'assigned_class': (profile.assigned_class or '').strip(),
        'assigned_classes': _profile_allowed_class_names(profile),
        'assigned_subject_id': profile.assigned_subject_id,
        'assigned_subject_ids': subject_ids,
        'approval_status': profile.approval_status,
    }
