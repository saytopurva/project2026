"""Shared date parsing for attendance and related APIs."""

from datetime import date as date_cls

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime


def parse_calendar_date(raw):
    """Accept date objects, YYYY-MM-DD, or ISO datetime strings."""
    if raw is None:
        return None
    if isinstance(raw, date_cls):
        return raw
    s = str(raw).strip()
    if len(s) >= 10 and s[4] == '-' and s[7] == '-':
        d = parse_date(s[:10])
        if d:
            return d
    d = parse_date(s)
    if d:
        return d
    dt = parse_datetime(s)
    if dt:
        if timezone.is_aware(dt):
            return timezone.localdate(dt)
        return dt.date()
    return None


def student_pk(student_or_id):
    """Normalize PrimaryKeyRelatedField value to integer pk."""
    if student_or_id is None:
        return None
    if hasattr(student_or_id, 'pk'):
        return int(student_or_id.pk)
    return int(student_or_id)
