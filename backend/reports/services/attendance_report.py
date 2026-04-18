"""
Monthly attendance report payload for one student.

Used by GET /api/attendance/report/<student_id>/ and email body generation.
"""

from calendar import monthrange
from datetime import date

from django.utils import timezone

from attendance.models import Attendance


def attendance_report_generator(*, student, month: int, year: int) -> dict:
    """
    Returns a JSON-serializable dict with summary + daily rows + absent/leave with reasons.
    """
    start = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    end = date(year, month, last_day)

    qs = (
        Attendance.objects.filter(student=student, date__gte=start, date__lte=end)
        .select_related('student')
        .order_by('date', 'id')
    )

    total_days = qs.count()
    present = qs.filter(status=Attendance.Status.PRESENT).count()
    absent = qs.filter(status=Attendance.Status.ABSENT).count()
    leave = qs.filter(status=Attendance.Status.LEAVE).count()
    pct = round((present / total_days) * 100) if total_days else 0

    absent_with_reason = []
    for r in qs.filter(status=Attendance.Status.ABSENT):
        absent_with_reason.append(
            {
                'date': r.date.isoformat(),
                'status': r.status,
                'reason': (r.reason or '').strip(),
            }
        )
    leave_rows = []
    for r in qs.filter(status=Attendance.Status.LEAVE):
        leave_rows.append(
            {
                'date': r.date.isoformat(),
                'status': r.status,
                'reason': (r.reason or '').strip(),
            }
        )

    daily = [
        {
            'date': r.date.isoformat(),
            'status': r.status,
            'reason': r.reason or '',
        }
        for r in qs
    ]

    return {
        'student': {
            'id': student.id,
            'name': student.name,
            'class': student.student_class,
            'roll_no': student.roll_no,
        },
        'period': {
            'month': month,
            'year': year,
            'start': start.isoformat(),
            'end': end.isoformat(),
            'generated_at': timezone.now().isoformat(),
        },
        'summary': {
            'total_days': total_days,
            'present': present,
            'absent': absent,
            'leave': leave,
            'percentage': pct,
        },
        'absent_dates': absent_with_reason,
        'leave_dates': leave_rows,
        'daily': daily,
    }
