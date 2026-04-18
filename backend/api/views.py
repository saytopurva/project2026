from django.contrib.auth import get_user_model
import json
from django.db.models import Avg, Q
from django.utils import timezone
from django.utils.timesince import timesince
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    parser_classes,
    permission_classes,
)
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import (
    AcademicDetails,
    Attendance,
    Certificate,
    Event,
    FeesDetails,
    Marks,
    Notice,
    ParentDetails,
    Student,
)
from .serializers import (
    AttendanceSerializer,
    CertificateSerializer,
    EventSerializer,
    MarksSerializer,
    NoticeSerializer,
    StudentDetailSerializer,
    StudentSerializer,
)

User = get_user_model()


# --- Public auth ---


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def register(request):
    """Create a Django user (username = email) for JWT login. Idempotent if user exists."""
    email = (request.data.get('email') or '').strip().lower()
    password = request.data.get('password') or ''
    name = (request.data.get('name') or '').strip()
    if not email or not password:
        return Response(
            {'detail': 'email and password are required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if User.objects.filter(username=email).exists():
        return Response({'detail': 'user already exists'}, status=status.HTTP_200_OK)
    User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=name[:150] if name else '',
    )
    return Response({'detail': 'created'}, status=status.HTTP_201_CREATED)


# --- Protected: students ---


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_students(request):
    students = Student.objects.all()
    serializer = StudentSerializer(students, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def add_student(request):
    serializer = StudentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def student_detail(request, pk):
    try:
        student = (
            Student.objects.select_related('parents', 'academic', 'fees')
            .prefetch_related('certificates')
            .get(pk=pk)
        )
    except Student.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = StudentDetailSerializer(student, context={'request': request})
        return Response(serializer.data)

    partial = request.method == 'PATCH'
    # If request is multipart, nested objects may arrive as JSON strings.
    data = request.data
    if hasattr(request.data, 'copy'):
        data = request.data.copy()
        for k in ('parents', 'academic', 'fees'):
            v = data.get(k)
            if isinstance(v, str) and v.strip():
                try:
                    data[k] = json.loads(v)
                except Exception:
                    pass

    serializer = StudentDetailSerializer(
        student,
        data=data,
        partial=partial,
        context={'request': request},
    )
    if serializer.is_valid():
        serializer.save()
        # Ensure related rows exist for clean UI (optional but handy)
        ParentDetails.objects.get_or_create(student=student)
        AcademicDetails.objects.get_or_create(student=student)
        FeesDetails.objects.get_or_create(student=student)
        # Reload with relations so updated nested data is reflected in response
        student = (
            Student.objects.select_related('parents', 'academic', 'fees')
            .prefetch_related('certificates')
            .get(pk=pk)
        )
        out = StudentDetailSerializer(student, context={'request': request})
        return Response(out.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def student_certificates_create(request, pk):
    try:
        student = Student.objects.get(pk=pk)
    except Student.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    payload = request.data.copy()
    payload['student'] = student.id
    serializer = CertificateSerializer(data=payload, context={'request': request})
    if serializer.is_valid():
        cert = serializer.save(student=student)
        out = CertificateSerializer(cert, context={'request': request})
        return Response(out.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def student_certificate_delete(request, pk):
    try:
        cert = Certificate.objects.get(pk=pk)
    except Certificate.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    cert.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# --- Protected: attendance ---


def _attendance_queryset(request):
    qs = Attendance.objects.select_related('student', 'marked_by').order_by('-date', '-id')
    student = request.query_params.get('student')
    if student:
        qs = qs.filter(student_id=student)
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
    return qs


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def attendance_list_create(request):
    if request.method == 'GET':
        qs = _attendance_queryset(request)
        serializer = AttendanceSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    serializer = AttendanceSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def attendance_by_student(request, student_id):
    qs = (
        Attendance.objects.filter(student_id=student_id)
        .select_related('student', 'marked_by')
        .order_by('-date', '-id')
    )
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
    pct = round((present_n / total) * 100) if total else 0
    return Response(
        {
            'results': serializer.data,
            'count': total,
            'attendance_percentage': pct,
        }
    )


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def attendance_detail(request, pk):
    try:
        rec = Attendance.objects.select_related('student', 'marked_by').get(pk=pk)
    except Attendance.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = AttendanceSerializer(rec, context={'request': request})
        return Response(serializer.data)

    if request.method == 'DELETE':
        rec.delete()
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
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def attendance_bulk(request):
    """
    Body: { "date": "YYYY-MM-DD", "entries": [ {"student": id, "status": "PRESENT"|..., "leave_reason": ""}, ... ] }
    """
    from django.utils.dateparse import parse_date

    date_str = (request.data.get('date') or '').strip()
    entries = request.data.get('entries') or []
    d = parse_date(date_str) if date_str else None
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
        lr = (row.get('leave_reason') or '').strip()
        if not sid:
            errors.append({str(i): 'student id required'})
            continue
        if not Student.objects.filter(pk=sid).exists():
            errors.append({str(i): f'Unknown student {sid}'})
            continue
        if st not in ('PRESENT', 'ABSENT', 'LEAVE'):
            errors.append({str(i): f'Invalid status: {st}'})
            continue
        if st == 'LEAVE' and not lr:
            errors.append({str(i): 'leave_reason required for LEAVE'})
            continue
        obj, _ = Attendance.objects.update_or_create(
            student_id=sid,
            date=d,
            defaults={
                'status': st,
                'leave_reason': lr if st == Attendance.Status.LEAVE else '',
                'marked_by': user,
            },
        )
        ids.append(obj.id)

    return Response({'updated_ids': ids, 'errors': errors}, status=status.HTTP_200_OK)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def attendance_export(request):
    """CSV download: ?student=1&start=&end=&month="""
    import csv
    from django.http import HttpResponse

    qs = _attendance_queryset(request)
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="attendance.csv"'
    w = csv.writer(response)
    w.writerow(['id', 'student_id', 'student_name', 'date', 'status', 'leave_reason', 'marked_by', 'created_at'])
    for r in qs:
        w.writerow(
            [
                r.id,
                r.student_id,
                r.student.name,
                r.date,
                r.status,
                r.leave_reason or '',
                r.marked_by_id or '',
                r.created_at.isoformat() if r.created_at else '',
            ]
        )
    return response


# --- Protected: marks ---


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_marks(request):
    records = Marks.objects.select_related('student').order_by('-id')
    serializer = MarksSerializer(records, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def add_marks(request):
    serializer = MarksSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


# --- Protected: notices (school notice board) ---


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser, MultiPartParser, FormParser])
def notices_list_create(request):
    if request.method == 'GET':
        notices = Notice.objects.select_related('created_by').order_by('-created_at', '-id')
        q = (request.query_params.get('search') or '').strip()
        if q:
            notices = notices.filter(Q(title__icontains=q) | Q(content__icontains=q))
        if request.query_params.get('important') == '1':
            notices = notices.filter(is_important=True)
        serializer = NoticeSerializer(notices, many=True, context={'request': request})
        return Response(serializer.data)

    serializer = NoticeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def notice_delete(request, pk):
    try:
        notice = Notice.objects.get(pk=pk)
    except Notice.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if notice.created_by_id != request.user.id:
        return Response(
            {'detail': 'You can only delete notices you created.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    notice.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# --- Protected: events (calendar) ---


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def events_list_create(request):
    if request.method == 'GET':
        qs = Event.objects.select_related('created_by').order_by('date', '-created_at', '-id')
        q = (request.query_params.get('search') or '').strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        start = (request.query_params.get('start') or '').strip()
        end = (request.query_params.get('end') or '').strip()
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)

        event_type = (request.query_params.get('type') or '').strip()
        if event_type:
            qs = qs.filter(event_type=event_type)

        serializer = EventSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    serializer = EventSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def event_delete(request, pk):
    try:
        ev = Event.objects.get(pk=pk)
    except Event.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if ev.created_by_id != request.user.id:
        return Response(
            {'detail': 'You can only delete events you created.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    ev.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# --- Protected: dashboard (real data for React dashboard) ---


def _time_ago(dt):
    if not dt:
        return ''
    now = timezone.now()
    if timezone.is_naive(dt):
        # Best-effort: treat as current timezone
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return f'{timesince(dt, now).split(",")[0]} ago'


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Small KPI-only payload for the dashboard."""
    total_students = Student.objects.count()
    total_classes = (
        Student.objects.exclude(student_class__isnull=True)
        .exclude(student_class__exact='')
        .values_list('student_class', flat=True)
        .distinct()
        .count()
    )
    avg_marks = Marks.objects.aggregate(v=Avg('marks'))['v'] or 0

    # Last 30 days attendance %
    today = timezone.localdate()
    start = today - timezone.timedelta(days=30)
    att_qs = Attendance.objects.filter(date__gte=start, date__lte=today)
    total_att = att_qs.count()
    present_att = att_qs.filter(status=Attendance.Status.PRESENT).count()
    attendance_percent = round((present_att / total_att) * 100) if total_att else 0

    return Response(
        {
            'totalStudents': total_students,
            'attendancePercent': attendance_percent,
            'averageMarks': round(float(avg_marks)) if avg_marks else 0,
            'totalClasses': total_classes,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def dashboard_overview(request):
    """Full dashboard payload matching `DASHBOARD_OVERVIEW_MOCK` shape."""
    today = timezone.localdate()

    # KPIs
    total_students = Student.objects.count()
    total_classes = (
        Student.objects.exclude(student_class__isnull=True)
        .exclude(student_class__exact='')
        .values_list('student_class', flat=True)
        .distinct()
        .count()
    )
    avg_marks = Marks.objects.aggregate(v=Avg('marks'))['v'] or 0

    # Today attendance snapshot
    today_qs = Attendance.objects.filter(date=today)
    present_today = today_qs.filter(status=Attendance.Status.PRESENT).count()
    absent_today = today_qs.filter(status=Attendance.Status.ABSENT).count()
    leave_today = today_qs.filter(status=Attendance.Status.LEAVE).count()

    # Monthly attendance %
    start_30 = today - timezone.timedelta(days=30)
    att_30 = Attendance.objects.filter(date__gte=start_30, date__lte=today)
    total_att_30 = att_30.count()
    present_att_30 = att_30.filter(status=Attendance.Status.PRESENT).count()
    attendance_percent = round((present_att_30 / total_att_30) * 100) if total_att_30 else 0

    # Attendance trend: last 6 weeks, oldest -> newest
    attendance_trend = []
    for i in range(6, 0, -1):
        week_end = today - timezone.timedelta(days=(i - 1) * 7)
        week_start = week_end - timezone.timedelta(days=6)
        qs = Attendance.objects.filter(date__gte=week_start, date__lte=week_end)
        total = qs.count()
        present = qs.filter(status=Attendance.Status.PRESENT).count()
        pct = round((present / total) * 100) if total else 0
        attendance_trend.append({'label': f'Week {7 - i}', 'value': pct})

    # Marks distribution buckets
    buckets = [
        ('0–40', 0, 40),
        ('41–60', 41, 60),
        ('61–75', 61, 75),
        ('76–90', 76, 90),
        ('91–100', 91, 100),
    ]
    marks_distribution = []
    for label, lo, hi in buckets:
        marks_distribution.append(
            {'range': label, 'count': Marks.objects.filter(marks__gte=lo, marks__lte=hi).count()}
        )

    # Subject performance: average marks per subject (top 5 by volume, stable)
    subj_rows = (
        Marks.objects.values('subject')
        .annotate(avg=Avg('marks'))
        .order_by('-avg')[:5]
    )
    subject_performance = [
        {'name': r['subject'] or 'Unknown', 'value': round(float(r['avg'] or 0))}
        for r in subj_rows
    ]

    # Students list (for dashboard search demo)
    students = [
        {
            'id': str(s.id),
            'name': s.name,
            'className': str(s.student_class or ''),
            'section': '',
        }
        for s in Student.objects.order_by('-id')[:50]
    ]

    # Recent activity (simple, last 5 across a few tables)
    activity = []
    latest_student = Student.objects.order_by('-id').first()
    if latest_student:
        activity.append(
            {
                'id': f'student-{latest_student.id}',
                'type': 'student',
                'message': 'New student enrolled',
                'detail': f'{latest_student.name} added to Class {latest_student.student_class}',
                'time': 'recently',
            }
        )

    latest_notice = Notice.objects.select_related('created_by').order_by('-created_at', '-id').first()
    if latest_notice:
        activity.append(
            {
                'id': f'notice-{latest_notice.id}',
                'type': 'notice',
                'message': 'New notice posted',
                'detail': latest_notice.title,
                'time': _time_ago(latest_notice.created_at) or 'recently',
            }
        )

    latest_event = Event.objects.select_related('created_by').order_by('-created_at', '-id').first()
    if latest_event:
        # created_at is datetime
        activity.append(
            {
                'id': f'event-{latest_event.id}',
                'type': 'event',
                'message': 'Calendar event added',
                'detail': f'{latest_event.title} — {latest_event.date}',
                'time': _time_ago(latest_event.created_at) or 'recently',
            }
        )

    latest_marks = Marks.objects.select_related('student').order_by('-id').first()
    if latest_marks:
        activity.append(
            {
                'id': f'marks-{latest_marks.id}',
                'type': 'marks',
                'message': 'Marks updated',
                'detail': f'{latest_marks.subject} — {latest_marks.student.name}',
                'time': 'recently',
            }
        )

    latest_att = Attendance.objects.select_related('student').order_by('-date', '-id').first()
    if latest_att:
        activity.append(
            {
                'id': f'attendance-{latest_att.id}',
                'type': 'attendance',
                'message': 'Attendance marked',
                'detail': f'{latest_att.student.name} — {latest_att.date}',
                'time': 'recently',
            }
        )

    activity = activity[:5]

    return Response(
        {
            'totalStudents': total_students,
            'attendancePercent': attendance_percent,
            'averageMarks': round(float(avg_marks)) if avg_marks else 0,
            'totalClasses': total_classes,
            'attendanceTrend': attendance_trend,
            'marksDistribution': marks_distribution,
            'subjectPerformance': subject_performance,
            'recentActivity': activity,
            'todayAttendance': {
                'present': present_today,
                'absent': absent_today,
                'leave': leave_today,
            },
            'students': students,
        }
    )
