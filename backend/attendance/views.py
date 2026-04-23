import calendar
import csv
from collections import defaultdict
from datetime import date

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.activity_log import log_activity
from api.permissions import IsAuthenticatedAndSmsApproved
from api.date_utils import parse_calendar_date
from api.models import ActivityLog, Student
from api.rbac import (
    filter_attendance_queryset_for_user,
    subject_teacher_cannot_access_attendance,
    user_can_access_class,
    user_can_access_student,
)

from .models import Attendance
from .serializers import AttendanceSerializer


def _subject_teacher_block():
    return Response(
        {'detail': 'Subject teachers have read-only attendance access.'},
        status=status.HTTP_403_FORBIDDEN,
    )


def _filtered_queryset(request):
    qs = Attendance.objects.select_related('student', 'marked_by').order_by('-date', '-id')
    student = request.query_params.get('student')
    if student:
        qs = qs.filter(student_id=student)
    search = (request.query_params.get('search') or '').strip()
    if search:
        qs = qs.filter(student__name__icontains=search)
    start = (request.query_params.get('start') or '').strip()
    end = (request.query_params.get('end') or '').strip()
    if start:
        qs = qs.filter(date__gte=start)
    if end:
        qs = qs.filter(date__lte=end)
    month = (request.query_params.get('month') or '').strip()
    if month and len(month) >= 7:
        y, m = month.split('-')[:2]
        qs = qs.filter(date__year=int(y), date__month=int(m))
    st = (request.query_params.get('status') or '').strip().upper()
    if st in ('PRESENT', 'ABSENT', 'LEAVE'):
        qs = qs.filter(status=st)
    student_class = (request.query_params.get('class') or '').strip()
    if student_class:
        qs = qs.filter(student__student_class=student_class)
    qs = filter_attendance_queryset_for_user(qs, request.user)
    return qs


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def attendance_list_create(request):
    if subject_teacher_cannot_access_attendance(request.user) and request.method != 'GET':
        return _subject_teacher_block()

    if request.method == 'GET':
        qs = _filtered_queryset(request)
        serializer = AttendanceSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    data = request.data
    sid = data.get('student')
    raw_date = data.get('date')
    d = parse_calendar_date(raw_date)

    if sid is not None and d is not None:
        existing = Attendance.objects.filter(student_id=sid, date=d).first()
        if existing:
            if not filter_attendance_queryset_for_user(
                Attendance.objects.filter(pk=existing.pk), request.user
            ).exists():
                return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
            serializer = AttendanceSerializer(
                existing,
                data=data,
                partial=True,
                context={'request': request},
            )
            if serializer.is_valid():
                serializer.save()
                log_activity(
                    request.user,
                    ActivityLog.Action.ATTENDANCE_UPDATE,
                    target=f'attendance:{existing.id}',
                    metadata={'student_id': existing.student_id, 'date': str(existing.date)},
                )
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer = AttendanceSerializer(data=data, context={'request': request})
    if serializer.is_valid():
        stu = serializer.validated_data.get('student')
        pk = stu.pk if hasattr(stu, 'pk') else stu
        student = get_object_or_404(Student, pk=pk)
        if not user_can_access_student(request.user, student):
            return Response(
                {'detail': 'You cannot record attendance for this student.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        obj = serializer.save()
        log_activity(
            request.user,
            ActivityLog.Action.ATTENDANCE_CREATE,
            target=f'attendance:{obj.id}',
            metadata={'student_id': obj.student_id, 'date': str(obj.date)},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def attendance_by_student(request, student_id):
    if subject_teacher_cannot_access_attendance(request.user) and request.method != 'GET':
        return _subject_teacher_block()
    student = get_object_or_404(Student, pk=student_id)
    if not user_can_access_student(request.user, student):
        return Response(
            {'detail': 'You cannot view attendance for this student.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    qs = filter_attendance_queryset_for_user(
        Attendance.objects.filter(student_id=student_id).select_related('student', 'marked_by'),
        request.user,
    ).order_by('-date', '-id')
    start = (request.query_params.get('start') or '').strip()
    end = (request.query_params.get('end') or '').strip()
    month = (request.query_params.get('month') or '').strip()
    if start:
        qs = qs.filter(date__gte=start)
    if end:
        qs = qs.filter(date__lte=end)
    if month and len(month) >= 7:
        y, m = month.split('-')[:2]
        qs = qs.filter(date__year=int(y), date__month=int(m))
    st = (request.query_params.get('status') or '').strip().upper()
    if st in ('PRESENT', 'ABSENT', 'LEAVE'):
        qs = qs.filter(status=st)

    serializer = AttendanceSerializer(qs, many=True, context={'request': request})
    total = qs.count()
    present_n = qs.filter(status=Attendance.Status.PRESENT).count()
    absent_n = qs.filter(status=Attendance.Status.ABSENT).count()
    leave_n = qs.filter(status=Attendance.Status.LEAVE).count()
    pct = round((present_n / total) * 100) if total else 0
    return Response(
        {
            'results': serializer.data,
            'count': total,
            'present': present_n,
            'absent': absent_n,
            'leave': leave_n,
            'attendance_percentage': pct,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def attendance_monthly_summary(request, student_id):
    """GET /api/attendance/summary/<student_id>/?month=&year= — counts for one calendar month."""
    if subject_teacher_cannot_access_attendance(request.user) and request.method != 'GET':
        return _subject_teacher_block()
    student = get_object_or_404(Student, pk=student_id)
    if not user_can_access_student(request.user, student):
        return Response(
            {'detail': 'You cannot view attendance for this student.'},
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

    qs = filter_attendance_queryset_for_user(
        Attendance.objects.filter(student_id=student_id, date__year=year, date__month=month),
        request.user,
    )
    total = qs.count()
    present_n = qs.filter(status=Attendance.Status.PRESENT).count()
    absent_n = qs.filter(status=Attendance.Status.ABSENT).count()
    leave_n = qs.filter(status=Attendance.Status.LEAVE).count()
    pct = round((present_n / total) * 100) if total else 0
    return Response(
        {
            'student_id': student_id,
            'month': month,
            'year': year,
            'total_days': total,
            'present': present_n,
            'absent': absent_n,
            'leave': leave_n,
            'percentage': pct,
        }
    )


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def attendance_detail(request, pk):
    if subject_teacher_cannot_access_attendance(request.user) and request.method != 'GET':
        return _subject_teacher_block()
    try:
        rec = Attendance.objects.select_related('student', 'marked_by').get(pk=pk)
    except Attendance.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if not filter_attendance_queryset_for_user(
        Attendance.objects.filter(pk=pk), request.user
    ).exists():
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(AttendanceSerializer(rec, context={'request': request}).data)

    if request.method == 'DELETE':
        rid, sid, d = rec.id, rec.student_id, rec.date
        rec.delete()
        log_activity(
            request.user,
            ActivityLog.Action.ATTENDANCE_UPDATE,
            target=f'attendance_deleted:{rid}',
            metadata={'student_id': sid, 'date': str(d)},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == 'PATCH'
    serializer = AttendanceSerializer(
        rec,
        data=request.data,
        partial=partial,
        context={'request': request},
    )
    if serializer.is_valid():
        serializer.save()
        log_activity(
            request.user,
            ActivityLog.Action.ATTENDANCE_UPDATE,
            target=f'attendance:{rec.id}',
            metadata={'student_id': rec.student_id, 'date': str(rec.date)},
        )
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def attendance_bulk(request):
    """
    Body: { "date": "YYYY-MM-DD", "entries": [ {"student": id, "status": "...", "reason": "..."}, ... ] }
    """
    if subject_teacher_cannot_access_attendance(request.user):
        return _subject_teacher_block()

    date_str = (request.data.get('date') or '').strip()
    entries = request.data.get('entries') or []
    d = parse_calendar_date(date_str) if date_str else None
    if not d:
        return Response({'detail': 'Valid date is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not isinstance(entries, list):
        return Response({'detail': 'entries must be a list.'}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user
    ids = []
    errors = []
    for i, row in enumerate(entries):
        sid = row.get('student')
        st = (row.get('status') or '').strip().upper()
        reason = (row.get('reason') or '').strip()
        if not sid:
            errors.append({str(i): 'student id required'})
            continue
        try:
            stu = Student.objects.get(pk=sid)
        except Student.DoesNotExist:
            errors.append({str(i): f'Unknown student {sid}'})
            continue
        if not user_can_access_student(user, stu):
            errors.append({str(i): 'not allowed for this student'})
            continue
        if st not in ('PRESENT', 'ABSENT', 'LEAVE'):
            errors.append({str(i): f'Invalid status: {st}'})
            continue
        if st in ('ABSENT', 'LEAVE') and not reason:
            errors.append({str(i): 'reason required for Absent or Leave'})
            continue
        if st == 'PRESENT':
            reason = ''
        obj, _ = Attendance.objects.update_or_create(
            student_id=sid,
            date=d,
            defaults={
                'status': st,
                'reason': reason,
                'marked_by': user,
            },
        )
        ids.append(obj.id)

    if ids:
        log_activity(
            user,
            ActivityLog.Action.ATTENDANCE_CREATE,
            target=f'bulk:{d.isoformat()}',
            metadata={'count': len(ids), 'date': str(d)},
        )

    return Response({'updated_ids': ids, 'errors': errors}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def attendance_analytics(request):
    """
    GET /api/attendance/analytics/?class_name=&month=&year=

    Daily counts (present / absent / leave) for one class and calendar month,
    plus summary and lowest-attendance students in that month.
    """
    if subject_teacher_cannot_access_attendance(request.user) and request.method != 'GET':
        return _subject_teacher_block()

    class_name = (request.query_params.get('class_name') or '').strip()
    month_s = (request.query_params.get('month') or '').strip()
    year_s = (request.query_params.get('year') or '').strip()
    if not class_name:
        return Response(
            {'detail': 'Query param class_name is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not user_can_access_class(request.user, class_name):
        return Response(
            {'detail': 'You do not have access to attendance for this class.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    if not month_s.isdigit() or not year_s.isdigit():
        return Response(
            {'detail': 'Query params month and year are required (integers).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    month = int(month_s)
    year = int(year_s)
    if month < 1 or month > 12:
        return Response({'detail': 'month must be 1–12.'}, status=status.HTTP_400_BAD_REQUEST)

    students_qs = Student.objects.filter(student_class=class_name)
    total_students = students_qs.count()
    student_ids = list(students_qs.values_list('pk', flat=True))
    student_names = dict(students_qs.values_list('pk', 'name'))

    _, last_day = calendar.monthrange(year, month)
    start = date(year, month, 1)
    end = date(year, month, last_day)

    qs = filter_attendance_queryset_for_user(
        Attendance.objects.filter(student_id__in=student_ids, date__gte=start, date__lte=end),
        request.user,
    )

    by_date = defaultdict(lambda: {'present': 0, 'absent': 0, 'leave': 0})
    by_student = defaultdict(lambda: {'present': 0, 'absent': 0, 'leave': 0})

    for row in qs.iterator():
        d = row.date
        sid = row.student_id
        if row.status == Attendance.Status.PRESENT:
            by_date[d]['present'] += 1
            by_student[sid]['present'] += 1
        elif row.status == Attendance.Status.ABSENT:
            by_date[d]['absent'] += 1
            by_student[sid]['absent'] += 1
        elif row.status == Attendance.Status.LEAVE:
            by_date[d]['leave'] += 1
            by_student[sid]['leave'] += 1

    daily_data = []
    for day in range(1, last_day + 1):
        cur = date(year, month, day)
        c = by_date.get(cur, {'present': 0, 'absent': 0, 'leave': 0})
        daily_data.append(
            {
                'date': cur.isoformat(),
                'present': c['present'],
                'absent': c['absent'],
                'leave': c['leave'],
            }
        )

    tot_p = sum(d['present'] for d in daily_data)
    tot_a = sum(d['absent'] for d in daily_data)
    tot_l = sum(d['leave'] for d in daily_data)
    denom = tot_p + tot_a + tot_l
    avg_attendance = round(100.0 * tot_p / denom) if denom else 0

    daily_rates = []
    for d in daily_data:
        s = d['present'] + d['absent'] + d['leave']
        if s > 0:
            daily_rates.append(100.0 * d['present'] / s)
    avg_daily_attendance = round(sum(daily_rates) / len(daily_rates)) if daily_rates else 0

    defaulters = []
    for sid in student_ids:
        st = by_student[sid]
        total_m = st['present'] + st['absent'] + st['leave']
        if total_m == 0:
            continue
        pct = round(100.0 * st['present'] / total_m, 1)
        defaulters.append(
            {
                'student_id': sid,
                'name': student_names.get(sid, ''),
                'attendance_percent': pct,
                'absent_days': st['absent'],
                'leave_days': st['leave'],
                'present_days': st['present'],
            }
        )
    defaulters.sort(key=lambda x: (x['attendance_percent'], -x['absent_days']))
    top_defaulters = defaulters[:10]

    month_label = calendar.month_name[month]

    return Response(
        {
            'class': class_name,
            'month': month_label,
            'month_number': month,
            'year': year,
            'daily_data': daily_data,
            'summary': {
                'avg_attendance': avg_attendance,
                'avg_daily_attendance': avg_daily_attendance,
                'total_students': total_students,
                'total_absents': tot_a,
            },
            'top_defaulters': top_defaulters,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def attendance_export(request):
    if subject_teacher_cannot_access_attendance(request.user) and request.method != 'GET':
        return _subject_teacher_block()
    qs = _filtered_queryset(request)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="attendance.csv"'
    w = csv.writer(response)
    w.writerow(['id', 'student_id', 'student_name', 'date', 'status', 'reason', 'marked_by', 'created_at'])
    for r in qs:
        w.writerow(
            [
                r.id,
                r.student_id,
                r.student.name,
                r.date,
                r.status,
                r.reason or '',
                r.marked_by_id or '',
                r.created_at.isoformat() if r.created_at else '',
            ]
        )
    return response
