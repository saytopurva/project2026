import csv
from io import StringIO

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.models import Student
from api.permissions import IsAuthenticatedAndSmsApproved
from api.rbac import subject_teacher_cannot_access_attendance, user_can_access_student

from .models import AttendanceReportSendLog
from .services.attendance_report import attendance_report_generator
from .services.email_report import format_report_email_body, send_attendance_report_email


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def attendance_monthly_report(request, student_id):
    """
    GET /api/attendance/report/<student_id>/?month=&year=&format=json|csv
    """
    if subject_teacher_cannot_access_attendance(request.user):
        return Response(
            {'detail': 'Subject teachers cannot access attendance reports.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    student = get_object_or_404(Student, pk=student_id)
    if not user_can_access_student(request.user, student):
        return Response(
            {'detail': 'You cannot access reports for this student.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    month_s = (request.query_params.get('month') or '').strip()
    year_s = (request.query_params.get('year') or '').strip()
    if not month_s.isdigit() or not year_s.isdigit():
        return Response(
            {'detail': 'Query params month and year are required (integers).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    month = int(month_s)
    year = int(year_s)
    if month < 1 or month > 12:
        return Response({'detail': 'month must be 1–12.'}, status=status.HTTP_400_BAD_REQUEST)

    payload = attendance_report_generator(student=student, month=month, year=year)
    fmt = (request.query_params.get('format') or 'json').strip().lower()
    if fmt == 'csv':
        return _report_csv_response(payload)
    return Response(payload)


def _report_csv_response(payload: dict) -> HttpResponse:
    buf = StringIO()
    w = csv.writer(buf)
    w.writerow(['date', 'status', 'reason'])
    for row in payload.get('daily', []):
        w.writerow([row['date'], row['status'], row.get('reason') or ''])
    response = HttpResponse(buf.getvalue(), content_type='text/csv')
    st = payload['student']
    fname = f"attendance_{st['id']}_{payload['period']['year']}_{payload['period']['month']:02d}.csv"
    response['Content-Disposition'] = f'attachment; filename="{fname}"'
    return response


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def send_attendance_report(request, student_id):
    """
    POST /api/send-report/<student_id>/
    Body: { "month": 4, "year": 2026 }
    """
    if subject_teacher_cannot_access_attendance(request.user):
        return Response(
            {'detail': 'Subject teachers cannot access attendance reports.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    student = get_object_or_404(Student, pk=student_id)
    if not user_can_access_student(request.user, student):
        return Response(
            {'detail': 'You cannot access reports for this student.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    month = request.data.get('month')
    year = request.data.get('year')
    try:
        month = int(month)
        year = int(year)
    except (TypeError, ValueError):
        return Response({'detail': 'month and year must be integers.'}, status=status.HTTP_400_BAD_REQUEST)
    if month < 1 or month > 12:
        return Response({'detail': 'month must be 1–12.'}, status=status.HTTP_400_BAD_REQUEST)

    email = (getattr(student, 'parent_email', None) or '').strip()
    if not email:
        return Response(
            {'detail': 'Student has no parent_email set.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    payload = attendance_report_generator(student=student, month=month, year=year)
    body = format_report_email_body(payload)

    try:
        send_attendance_report_email(
            to_email=email,
            student_name=student.name,
            month=month,
            year=year,
            body_text=body,
            fail_silently=False,
        )
        AttendanceReportSendLog.objects.create(
            student=student,
            month=month,
            year=year,
            status=AttendanceReportSendLog.Status.SUCCESS,
            recipient_email=email,
        )
        return Response({'detail': 'Report sent.', 'recipient': email}, status=status.HTTP_200_OK)
    except Exception as exc:
        AttendanceReportSendLog.objects.create(
            student=student,
            month=month,
            year=year,
            status=AttendanceReportSendLog.Status.FAILED,
            error_message=str(exc)[:2000],
            recipient_email=email,
        )
        return Response(
            {'detail': 'Failed to send email.', 'error': str(exc)},
            status=status.HTTP_502_BAD_GATEWAY,
        )
