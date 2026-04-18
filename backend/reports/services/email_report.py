import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def send_attendance_report_email(
    *,
    to_email: str,
    student_name: str,
    month: int,
    year: int,
    body_text: str,
    fail_silently: bool = False,
) -> None:
    if not to_email:
        raise ValueError('Recipient email is required.')

    subject = f'Attendance report — {student_name} ({month:02d}/{year})'
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'webmaster@localhost'
    send_mail(
        subject,
        body_text,
        from_email,
        [to_email],
        fail_silently=fail_silently,
    )


def format_report_email_body(report_payload: dict) -> str:
    s = report_payload['summary']
    st = report_payload['student']
    lines = [
        f"Attendance report for {st['name']}",
        f"Class: {st.get('class') or '—'}  Roll: {st.get('roll_no') or '—'}",
        '',
        f"Period: {report_payload['period']['month']:02d}/{report_payload['period']['year']}",
        f"Total records: {s['total_days']}",
        f"Present: {s['present']}  Absent: {s['absent']}  Leave: {s['leave']}",
        f"Attendance %: {s['percentage']}%",
        '',
    ]
    leaves = report_payload.get('leave_dates') or []
    if leaves:
        lines.append('Leave (with reasons):')
        for row in leaves:
            lines.append(f"  - {row['date']}: {row.get('reason') or '—'}")
        lines.append('')
    absents = report_payload.get('absent_dates') or []
    if absents:
        lines.append('Absent (with reasons):')
        for row in absents:
            lines.append(f"  - {row['date']}: {row.get('reason') or '—'}")
    return '\n'.join(lines)
