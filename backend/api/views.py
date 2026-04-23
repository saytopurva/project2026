from django.contrib.auth import get_user_model
import json
import re
from urllib.parse import unquote

from django.db.models import Avg, ExpressionWrapper, F, FloatField, Q
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

from .permissions import IsAuthenticatedAndSmsApproved
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from attendance.models import Attendance
from marks.models import Marks as StructuredMark

from .activity_log import log_activity
from .models import (
    AcademicDetails,
    ActivityLog,
    Certificate,
    Event,
    FeesDetails,
    Notice,
    ParentDetails,
    SchoolClass,
    Student,
    UserProfile,
)
from .rbac import (
    filter_attendance_queryset_for_user,
    filter_marks_queryset_for_user,
    filter_student_queryset_for_user,
    get_profile,
    profile_to_claims,
    user_can_access_class,
    user_can_access_class_results,
    user_can_access_student,
    user_can_edit_student_record,
    user_can_manage_teachers,
    user_has_operational_access,
    user_is_privileged,
    user_sees_limited_student_detail,
)
from .serializers import (
    ApprovePendingUserSerializer,
    CertificateSerializer,
    CreateSchoolUserSerializer,
    EventSerializer,
    NoticeSerializer,
    StudentDetailSerializer,
    StudentLimitedSerializer,
    StudentSerializer,
    UpdateUserRoleSerializer,
)

User = get_user_model()


def _avg_percentage_marks_qs(qs):
    row = qs.aggregate(
        v=Avg(
            ExpressionWrapper(
                F('marks_obtained') * 100.0 / F('total_marks'),
                output_field=FloatField(),
            )
        )
    )
    return float(row['v'] or 0)


def _avg_percentage_structured_marks():
    return _avg_percentage_marks_qs(StructuredMark.objects.all())


# --- Public auth ---


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def health_check(request):
    """Liveness check for the API (no auth). Use: GET /api/health/"""
    return Response({'status': 'ok', 'service': 'sms-api'})


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def current_user_me(request):
    """GET /api/me/ — role + scope for RBAC UI."""
    u = request.user
    p = get_profile(u)
    if u.is_superuser and not p:
        return Response(
            {
                'id': u.id,
                'email': u.email,
                'name': (u.get_full_name() or u.first_name or u.username or '').strip(),
                'last_login': u.last_login.isoformat() if u.last_login else None,
                'role': UserProfile.Role.PRINCIPAL,
                'assigned_class': '',
                'assigned_subject_id': None,
                'assigned_subject_name': None,
                'rbac_label': 'Superuser',
                'approval_status': UserProfile.ApprovalStatus.APPROVED,
                'can_access_app': True,
                'picture': '',
            }
        )
    claims = profile_to_claims(p)
    sub_name = None
    if p and getattr(p, 'assigned_subject_id', None) and p.assigned_subject:
        sub_name = p.assigned_subject.name
    subject_names = None
    if p:
        try:
            subject_names = list(
                p.assigned_subjects.order_by('name').values_list('name', flat=True)
            )
        except Exception:
            subject_names = None
    rbac_label = 'Staff'
    if p and p.approval_status == UserProfile.ApprovalStatus.REJECTED:
        rbac_label = 'Access denied'
    elif p and p.role == UserProfile.Role.UNASSIGNED:
        rbac_label = 'Pending approval'
    elif user_is_privileged(u):
        rbac_label = 'Full access (Principal / Vice Principal)'
    elif p and p.role == UserProfile.Role.STAFF:
        rbac_label = 'Admin staff'
    elif p and p.role == UserProfile.Role.CLASS_TEACHER and (p.assigned_class or '').strip():
        rbac_label = f'Your class: {p.assigned_class.strip()}'
    elif p and p.role == UserProfile.Role.SUBJECT_TEACHER:
        rbac_label = f'Your subject: {sub_name or "—"}'

    can_access = user_has_operational_access(u)

    return Response(
        {
            'id': u.id,
            'email': u.email,
            'name': (u.get_full_name() or u.first_name or u.username or '').strip(),
            'last_login': u.last_login.isoformat() if u.last_login else None,
            'role': claims['role'],
            'assigned_class': claims['assigned_class'],
            'assigned_classes': claims.get('assigned_classes') or [],
            'assigned_subject_id': claims['assigned_subject_id'],
            'assigned_subject_ids': claims.get('assigned_subject_ids') or [],
            'assigned_subject_name': sub_name,
            'assigned_subject_names': subject_names or ([sub_name] if sub_name else []),
            'rbac_label': rbac_label,
            'approval_status': claims.get('approval_status'),
            'can_access_app': can_access,
            'picture': (p.avatar_url or '') if p else '',
        }
    )


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def create_school_user(request):
    """POST /api/users/create-user/ — Principal / Vice Principal only."""
    if not user_can_manage_teachers(request.user):
        return Response(
            {'detail': 'Only Principal or Vice Principal can create users.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    ser = CreateSchoolUserSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    try:
        user = ser.save()
    except Exception as e:
        return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    log_activity(
        request.user,
        ActivityLog.Action.USER_CREATE,
        target=user.email,
        metadata={'user_id': user.id, 'role': request.data.get('role')},
    )
    return Response({'id': user.id, 'email': user.email}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def list_pending_users(request):
    """GET /api/users/pending/ — Principal / Vice Principal only."""
    if not user_can_manage_teachers(request.user):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    qs = (
        UserProfile.objects.filter(
            approval_status=UserProfile.ApprovalStatus.PENDING,
            role=UserProfile.Role.UNASSIGNED,
        )
        .select_related('user')
        .order_by('-user__date_joined')
    )
    out = []
    for prof in qs:
        u = prof.user
        out.append(
            {
                'id': u.id,
                'email': u.email,
                'name': (u.get_full_name() or u.first_name or u.username or '').strip(),
                'requested_at': prof.user.date_joined.isoformat() if u.date_joined else '',
            }
        )
    return Response(out)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def approve_pending_user(request, pk):
    """POST /api/users/<id>/approve/ — assign role and approve."""
    if not user_can_manage_teachers(request.user):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        prof = UserProfile.objects.select_related('user').get(user_id=pk)
    except UserProfile.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    if prof.approval_status != UserProfile.ApprovalStatus.PENDING:
        return Response(
            {'detail': 'User is not pending approval.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    ser = ApprovePendingUserSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    data = ser.validated_data
    subj = data.get('assigned_subject')
    prof.role = data['role']
    assigned_classes = [
        str(c).strip()
        for c in (data.get('assigned_classes') or [])
        if str(c).strip()
    ]
    single = (data.get('assigned_class') or '').strip()
    if not assigned_classes and single:
        assigned_classes = [single]
    prof.assigned_class = single or (assigned_classes[0] if assigned_classes else '')
    prof.assigned_subject = subj
    prof.approval_status = UserProfile.ApprovalStatus.APPROVED
    prof.save()
    if prof.role in (UserProfile.Role.CLASS_TEACHER, UserProfile.Role.SUBJECT_TEACHER):
        cls_objs = [SchoolClass.objects.get_or_create(name=c)[0] for c in assigned_classes]
        prof.assigned_classes.set(cls_objs)
    else:
        prof.assigned_classes.clear()
    if prof.role == UserProfile.Role.SUBJECT_TEACHER and subj:
        prof.assigned_subjects.set([subj])
    else:
        prof.assigned_subjects.clear()
    log_activity(
        request.user,
        ActivityLog.Action.USER_APPROVE,
        target=prof.user.email,
        metadata={'user_id': pk, 'role': prof.role, 'assigned_classes': assigned_classes},
    )
    return Response({'detail': 'User approved.', 'id': pk})


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def reject_pending_user(request, pk):
    """POST /api/users/<id>/reject/"""
    if not user_can_manage_teachers(request.user):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        prof = UserProfile.objects.get(user_id=pk)
    except UserProfile.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    if prof.approval_status != UserProfile.ApprovalStatus.PENDING:
        return Response(
            {'detail': 'User is not pending approval.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    prof.approval_status = UserProfile.ApprovalStatus.REJECTED
    prof.save(update_fields=['approval_status'])
    log_activity(
        request.user,
        ActivityLog.Action.USER_REJECT,
        target=prof.user.email,
        metadata={'user_id': pk, 'reason': request.data.get('reason', '')},
    )
    return Response({'detail': 'User rejected.', 'id': pk})


@api_view(['PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def update_user_role(request, pk):
    """PATCH /api/users/<id>/profile/ — change role / scope (Principal / VP)."""
    if not user_can_manage_teachers(request.user):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    if request.user.id == int(pk):
        return Response(
            {'detail': 'You cannot change your own role via this endpoint.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        prof = UserProfile.objects.select_related('user').get(user_id=pk)
    except UserProfile.DoesNotExist:
        return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
    ser = UpdateUserRoleSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    data = ser.validated_data
    subj = data.get('assigned_subject')
    old = prof.role
    prof.role = data['role']
    assigned_classes = [
        str(c).strip()
        for c in (data.get('assigned_classes') or [])
        if str(c).strip()
    ]
    single = (data.get('assigned_class') or '').strip()
    if not assigned_classes and single:
        assigned_classes = [single]
    prof.assigned_class = single or (assigned_classes[0] if assigned_classes else '')
    prof.assigned_subject = subj
    if prof.approval_status == UserProfile.ApprovalStatus.PENDING:
        prof.approval_status = UserProfile.ApprovalStatus.APPROVED
    prof.save()
    if prof.role in (UserProfile.Role.CLASS_TEACHER, UserProfile.Role.SUBJECT_TEACHER):
        cls_objs = [SchoolClass.objects.get_or_create(name=c)[0] for c in assigned_classes]
        prof.assigned_classes.set(cls_objs)
    else:
        prof.assigned_classes.clear()
    if prof.role == UserProfile.Role.SUBJECT_TEACHER and subj:
        prof.assigned_subjects.set([subj])
    else:
        prof.assigned_subjects.clear()
    log_activity(
        request.user,
        ActivityLog.Action.USER_ROLE_UPDATE,
        target=prof.user.email,
        metadata={
            'user_id': pk,
            'from_role': old,
            'to_role': prof.role,
            'assigned_classes': assigned_classes,
        },
    )
    return Response({'detail': 'Profile updated.', 'id': pk})


# --- Protected: students ---


def _natural_class_sort_key(value):
    """
    Sort class labels so 5,6,7,8,9,10 not 10,5,6,7,8,9 (plain string order).
    Leading digits compare numerically; remainder (e.g. A/B) compares lexically.
    """
    s = str(value).strip()
    m = re.match(r'^(\d+)(.*)$', s)
    if m:
        return (0, int(m.group(1)), m.group(2).lower())
    return (1, s.lower())


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def list_student_classes(request):
    """
    GET /api/students/classes/ — distinct class names (student_class), sorted for UI tabs.
    """
    from marks.models import Marks

    raw = (
        Student.objects.exclude(student_class__isnull=True)
        .exclude(student_class__exact='')
        .values_list('student_class', flat=True)
    )
    classes = sorted(set(raw), key=_natural_class_sort_key)
    if not user_is_privileged(request.user):
        p = get_profile(request.user)
        if p and p.role == UserProfile.Role.STAFF:
            pass
        elif p and p.role == UserProfile.Role.CLASS_TEACHER:
            allowed = []
            try:
                allowed = list(p.assigned_classes.values_list('name', flat=True))
            except Exception:
                allowed = []
            if not allowed and (p.assigned_class or '').strip():
                allowed = [p.assigned_class.strip()]
            classes = [c for c in classes if c in set(a.strip() for a in allowed if str(a).strip())]
        elif p and p.role == UserProfile.Role.SUBJECT_TEACHER:
            allowed = []
            try:
                allowed = list(p.assigned_classes.values_list('name', flat=True))
            except Exception:
                allowed = []
            if not allowed and (p.assigned_class or '').strip():
                allowed = [p.assigned_class.strip()]
            allowed_set = set(a.strip() for a in allowed if str(a).strip())
            classes = [c for c in classes if c in allowed_set]
        else:
            classes = []
    return Response(classes)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def get_students(request):
    """
    GET /api/students/ — optional ?class_name=… filters by ``Student.student_class`` (exact).
    Ordered by roll number.
    """
    qs = filter_student_queryset_for_user(Student.objects.all(), request.user)
    class_name = (request.query_params.get('class_name') or '').strip()
    if class_name:
        qs = qs.filter(student_class=class_name)
    qs = qs.order_by('roll_no', 'id')
    if user_sees_limited_student_detail(request.user):
        serializer = StudentLimitedSerializer(qs, many=True)
    else:
        serializer = StudentSerializer(qs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def students_by_class(request, class_name):
    """
    GET /api/students/class/{class_name}/ — roster for class sheet (sorted by roll number).

    ``class_name`` is URL-encoded (e.g. ``10A``, ``6``). Matches ``Student.student_class`` exactly.
    """
    raw = unquote(class_name or '').strip()
    if not raw:
        return Response({'detail': 'class_name is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not user_can_access_class(request.user, raw):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)
    qs = filter_student_queryset_for_user(
        Student.objects.filter(student_class=raw),
        request.user,
    ).order_by('roll_no', 'id')
    data = [{'id': s.id, 'name': s.name, 'roll_number': s.roll_no} for s in qs]
    return Response(data)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def add_student(request):
    if not user_can_manage_teachers(request.user):
        return Response(
            {'detail': 'Only Principal or Vice Principal can add students.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    serializer = StudentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['GET', 'PUT', 'PATCH'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
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
        if not user_can_access_student(request.user, student):
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if user_sees_limited_student_detail(request.user):
            return Response(StudentLimitedSerializer(student).data)
        serializer = StudentDetailSerializer(student, context={'request': request})
        return Response(serializer.data)

    if not user_can_edit_student_record(request.user, student):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

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
@permission_classes([IsAuthenticatedAndSmsApproved])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def student_certificates_create(request, pk):
    try:
        student = Student.objects.get(pk=pk)
    except Student.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    if not user_can_edit_student_record(request.user, student):
        return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

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
@permission_classes([IsAuthenticatedAndSmsApproved])
def student_certificate_delete(request, pk):
    try:
        cert = Certificate.objects.get(pk=pk)
    except Certificate.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    cert.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# --- Protected: notices (school notice board) ---


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
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
@permission_classes([IsAuthenticatedAndSmsApproved])
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
@permission_classes([IsAuthenticatedAndSmsApproved])
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
@permission_classes([IsAuthenticatedAndSmsApproved])
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
@permission_classes([IsAuthenticatedAndSmsApproved])
def dashboard_stats(request):
    """Small KPI-only payload for the dashboard."""
    user = request.user
    stu_qs = filter_student_queryset_for_user(Student.objects.all(), user)
    total_students = stu_qs.count()
    total_classes = (
        stu_qs.exclude(student_class__isnull=True)
        .exclude(student_class__exact='')
        .values_list('student_class', flat=True)
        .distinct()
        .count()
    )
    mq = filter_marks_queryset_for_user(StructuredMark.objects.all(), user)
    avg_marks = _avg_percentage_marks_qs(mq)

    today = timezone.localdate()
    start = today - timezone.timedelta(days=30)
    att_qs = filter_attendance_queryset_for_user(
        Attendance.objects.filter(date__gte=start, date__lte=today),
        user,
    )
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
@permission_classes([IsAuthenticatedAndSmsApproved])
def dashboard_overview(request):
    """Full dashboard payload matching `DASHBOARD_OVERVIEW_MOCK` shape."""
    user = request.user
    today = timezone.localdate()

    stu_qs = filter_student_queryset_for_user(Student.objects.all(), user)
    mq_base = filter_marks_queryset_for_user(StructuredMark.objects.all(), user)
    att_base = filter_attendance_queryset_for_user(Attendance.objects.all(), user)

    total_students = stu_qs.count()
    total_classes = (
        stu_qs.exclude(student_class__isnull=True)
        .exclude(student_class__exact='')
        .values_list('student_class', flat=True)
        .distinct()
        .count()
    )
    avg_marks = _avg_percentage_marks_qs(mq_base)

    today_qs = att_base.filter(date=today)
    present_today = today_qs.filter(status=Attendance.Status.PRESENT).count()
    absent_today = today_qs.filter(status=Attendance.Status.ABSENT).count()
    leave_today = today_qs.filter(status=Attendance.Status.LEAVE).count()

    start_30 = today - timezone.timedelta(days=30)
    att_30 = att_base.filter(date__gte=start_30, date__lte=today)
    total_att_30 = att_30.count()
    present_att_30 = att_30.filter(status=Attendance.Status.PRESENT).count()
    attendance_percent = round((present_att_30 / total_att_30) * 100) if total_att_30 else 0

    attendance_trend = []
    for i in range(6, 0, -1):
        week_end = today - timezone.timedelta(days=(i - 1) * 7)
        week_start = week_end - timezone.timedelta(days=6)
        qs = att_base.filter(date__gte=week_start, date__lte=week_end)
        total = qs.count()
        present = qs.filter(status=Attendance.Status.PRESENT).count()
        pct = round((present / total) * 100) if total else 0
        attendance_trend.append({'label': f'Week {7 - i}', 'value': pct})

    buckets = [
        ('0–40', 0, 40),
        ('41–60', 41, 60),
        ('61–75', 61, 75),
        ('76–90', 76, 90),
        ('91–100', 91, 100),
    ]
    pct_expr = ExpressionWrapper(
        F('marks_obtained') * 100.0 / F('total_marks'),
        output_field=FloatField(),
    )
    marks_distribution = []
    for label, lo, hi in buckets:
        marks_distribution.append(
            {
                'range': label,
                'count': mq_base.annotate(pct=pct_expr).filter(pct__gte=lo, pct__lte=hi).count(),
            }
        )

    students = [
        {
            'id': str(s.id),
            'name': s.name,
            'className': str(s.student_class or ''),
            'section': '',
        }
        for s in stu_qs.order_by('-id')[:50]
    ]

    activity = []
    latest_student = stu_qs.order_by('-id').first()
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
        activity.append(
            {
                'id': f'event-{latest_event.id}',
                'type': 'event',
                'message': 'Calendar event added',
                'detail': f'{latest_event.title} — {latest_event.date}',
                'time': _time_ago(latest_event.created_at) or 'recently',
            }
        )

    latest_marks = mq_base.select_related('student', 'subject').order_by('-id').first()
    if latest_marks:
        activity.append(
            {
                'id': f'marks-{latest_marks.id}',
                'type': 'marks',
                'message': 'Marks updated',
                'detail': f'{latest_marks.subject.name} — {latest_marks.student.name}',
                'time': 'recently',
            }
        )

    latest_att = att_base.select_related('student').order_by('-date', '-id').first()
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

    p = get_profile(user)
    claims = profile_to_claims(p)
    sub_name = None
    if p and getattr(p, 'assigned_subject_id', None) and p.assigned_subject:
        sub_name = p.assigned_subject.name
    rbac_label = 'Staff'
    if user_is_privileged(user):
        rbac_label = 'Full access (Principal / Vice Principal)'
    elif p and p.role == UserProfile.Role.CLASS_TEACHER and (p.assigned_class or '').strip():
        rbac_label = f'Your class: {p.assigned_class.strip()}'
    elif p and p.role == UserProfile.Role.SUBJECT_TEACHER:
        rbac_label = f'Your subject: {sub_name or "—"}'

    return Response(
        {
            'totalStudents': total_students,
            'attendancePercent': attendance_percent,
            'averageMarks': round(float(avg_marks)) if avg_marks else 0,
            'totalClasses': total_classes,
            'attendanceTrend': attendance_trend,
            'marksDistribution': marks_distribution,
            'recentActivity': activity,
            'todayAttendance': {
                'present': present_today,
                'absent': absent_today,
                'leave': leave_today,
            },
            'students': students,
            'roleContext': {
                'role': claims['role'],
                'assigned_class': claims['assigned_class'],
                'assigned_subject_id': claims['assigned_subject_id'],
                'assigned_subject_name': sub_name,
                'rbac_label': rbac_label,
            },
        }
    )
