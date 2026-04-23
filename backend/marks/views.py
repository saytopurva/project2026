from __future__ import annotations

from django.db.models import Avg, Count, ExpressionWrapper, F, FloatField, Max, Min, Value
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.activity_log import log_activity
from api.permissions import IsAuthenticatedAndSmsApproved
from api.models import ActivityLog, Student, UserProfile
from api.rbac import (
    filter_marks_queryset_for_user,
    get_profile,
    user_can_access_class,
    user_can_access_class_results,
    user_can_access_student,
    user_is_privileged,
)

from .exam_totals import total_marks_for_exam_slug
from .models import ExamType, Marks, Subject
from .serializers import ExamTypeSerializer, MarksSerializer, SubjectSerializer
from .services.grading import letter_grade, percentage


def _forbidden(msg: str):
    return Response({'detail': msg}, status=status.HTTP_403_FORBIDDEN)


def _assert_can_write_mark(request, student: Student, subject_id) -> Response | None:
    """Return a Response (403) if this user may not create/update marks for this student+subject."""
    user = request.user
    if user_is_privileged(user):
        return None
    p = get_profile(user)
    if not p:
        return _forbidden('No staff profile for this account.')
    sid = int(subject_id) if subject_id is not None else None
    cls = str(student.student_class or '').strip()
    if p.role == UserProfile.Role.CLASS_TEACHER:
        if (p.assigned_class or '').strip() != cls:
            return _forbidden('You can only enter marks for students in your assigned class.')
        return None
    if p.role == UserProfile.Role.SUBJECT_TEACHER:
        allowed = set()
        try:
            allowed = set(p.assigned_subjects.values_list('id', flat=True))
        except Exception:
            allowed = set()
        if not allowed and getattr(p, 'assigned_subject_id', None):
            allowed = {int(p.assigned_subject_id)}
        if not allowed or sid not in {int(x) for x in allowed if x}:
            return _forbidden('You can only enter marks for your assigned subject(s).')
        if not user_can_access_student(user, student):
            return _forbidden('You cannot modify marks for this student.')
        return None
    return _forbidden('You are not allowed to modify marks.')


def _subject_rows_for_class_exam(class_name: str, exam_slug: str):
    """Aggregate marks per subject for one class and exam type."""
    try:
        max_marks = float(total_marks_for_exam_slug(exam_slug))
    except Exception:
        max_marks = 0.0
    qs = Marks.objects.filter(student__student_class=class_name, exam_type__slug=exam_slug)
    rows = (
        qs.values('subject__name')
        .annotate(
            avg_marks=Avg('marks_obtained'),
            hi=Max('marks_obtained'),
            lo=Min('marks_obtained'),
            total_students=Count('student', distinct=True),
        )
        .order_by('subject__name')
    )
    out = []
    for row in rows:
        avg_m = float(row['avg_marks'] or 0)
        pct = round(100.0 * avg_m / max_marks, 1) if max_marks else 0.0
        out.append(
            {
                'subject': row['subject__name'] or 'Unknown',
                'average_marks': round(avg_m, 1),
                'highest_marks': round(float(row['hi'] or 0), 1),
                'lowest_marks': round(float(row['lo'] or 0), 1),
                'total_students': row['total_students'],
                'percentage': pct,
            }
        )
    return out


def _summary_from_subjects(subjects):
    if not subjects:
        return {
            'best_subject': None,
            'weakest_subject': None,
            'overall_class_average': 0.0,
        }
    best = max(subjects, key=lambda x: x['percentage'])
    weak = min(subjects, key=lambda x: x['percentage'])
    overall = round(sum(s['percentage'] for s in subjects) / len(subjects), 1)
    return {
        'best_subject': best['subject'],
        'weakest_subject': weak['subject'],
        'overall_class_average': overall,
    }


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def subject_performance_analytics(request):
    """
    GET /api/analytics/subject-performance/?class_name=&exam_type=

    Optional: compare_class_name=, include_trend=true (adds Unit Test vs Semester aggregates).
    """
    class_name = (request.query_params.get('class_name') or '').strip()
    exam_slug = (request.query_params.get('exam_type') or '').strip().upper()
    compare_class = (request.query_params.get('compare_class_name') or '').strip()
    include_trend = (request.query_params.get('include_trend') or '').lower() in (
        '1',
        'true',
        'yes',
    )

    if not class_name:
        return Response(
            {'detail': 'Query param class_name is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not exam_slug:
        return Response(
            {'detail': 'Query param exam_type is required (UNIT_TEST, MID_SEM, SEMESTER).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not ExamType.objects.filter(slug=exam_slug).exists():
        return Response(
            {'detail': f'Unknown exam_type: {exam_slug!r}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user_can_access_class(request.user, class_name):
        return _forbidden('You do not have access to this class.')
    if compare_class and not user_can_access_class(request.user, compare_class):
        return _forbidden('You do not have access to the comparison class.')

    exam_obj = ExamType.objects.get(slug=exam_slug)
    subjects = _subject_rows_for_class_exam(class_name, exam_slug)
    prof = get_profile(request.user)
    if prof and prof.role == UserProfile.Role.SUBJECT_TEACHER:
        names = []
        try:
            names = list(prof.assigned_subjects.values_list('name', flat=True))
        except Exception:
            names = []
        if not names and prof.assigned_subject:
            names = [prof.assigned_subject.name]
        if names:
            allowed = set(str(n) for n in names if str(n).strip())
            subjects = [s for s in subjects if s['subject'] in allowed]
    summary = _summary_from_subjects(subjects)

    compare_payload = None
    if compare_class and compare_class != class_name:
        sub_b = _subject_rows_for_class_exam(compare_class, exam_slug)
        if prof and prof.role == UserProfile.Role.SUBJECT_TEACHER:
            names = []
            try:
                names = list(prof.assigned_subjects.values_list('name', flat=True))
            except Exception:
                names = []
            if not names and prof.assigned_subject:
                names = [prof.assigned_subject.name]
            if names:
                allowed = set(str(n) for n in names if str(n).strip())
                sub_b = [s for s in sub_b if s['subject'] in allowed]
        compare_payload = {
            'class_name': compare_class,
            'subjects': sub_b,
            'summary': _summary_from_subjects(sub_b),
        }

    trend_payload = None
    if include_trend:
        trend_payload = {}
        for slug in ('UNIT_TEST', 'SEMESTER'):
            if ExamType.objects.filter(slug=slug).exists():
                tr = _subject_rows_for_class_exam(class_name, slug)
                if prof and prof.role == UserProfile.Role.SUBJECT_TEACHER:
                    names = []
                    try:
                        names = list(prof.assigned_subjects.values_list('name', flat=True))
                    except Exception:
                        names = []
                    if not names and prof.assigned_subject:
                        names = [prof.assigned_subject.name]
                    if names:
                        allowed = set(str(n) for n in names if str(n).strip())
                        tr = [s for s in tr if s['subject'] in allowed]
                trend_payload[slug] = tr

    return Response(
        {
            'class_name': class_name,
            'exam_type': exam_slug,
            'exam_type_label': exam_obj.get_slug_display(),
            'subjects': subjects,
            'summary': summary,
            'compare': compare_payload,
            'trend': trend_payload,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def subject_list(request):
    """GET /api/subjects/ — predefined catalog (read-only)."""
    qs = Subject.objects.all()
    prof = get_profile(request.user)
    if prof and prof.role == UserProfile.Role.SUBJECT_TEACHER:
        try:
            ids = list(prof.assigned_subjects.values_list('id', flat=True))
        except Exception:
            ids = []
        if not ids and prof.assigned_subject_id:
            ids = [prof.assigned_subject_id]
        if ids:
            qs = qs.filter(pk__in=ids)
    q = (request.query_params.get('search') or '').strip()
    if q:
        qs = qs.filter(name__icontains=q)
    return Response(SubjectSerializer(qs, many=True).data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def exam_type_list(request):
    qs = ExamType.objects.all()
    return Response(ExamTypeSerializer(qs, many=True).data)


PASS_MARKS_FRACTION = 0.4  # 40% of total marks required to pass


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def teacher_subject_analytics(request):
    """
    GET /api/teacher/subject-analytics/?exam_type=

    Subject teachers: class-wise performance for their subject(s) across their assigned classes.
    Privileged users may call it too, but payload is most useful for subject teachers.
    """
    prof = get_profile(request.user)
    if not prof:
        return _forbidden('No staff profile for this account.')

    exam_slug = (request.query_params.get('exam_type') or '').strip().upper()
    if exam_slug and not ExamType.objects.filter(slug=exam_slug).exists():
        return Response(
            {'detail': f'Unknown exam_type: {exam_slug!r}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Allowed subjects (for subject teachers); for others we don't constrain by subject.
    allowed_subject_ids = None
    if prof.role == UserProfile.Role.SUBJECT_TEACHER:
        ids = list(prof.assigned_subjects.values_list('id', flat=True))
        if not ids and prof.assigned_subject_id:
            ids = [prof.assigned_subject_id]
        if not ids:
            return _forbidden('No subject assigned to your profile.')
        allowed_subject_ids = [int(x) for x in ids]

    # Allowed classes comes from RBAC-filtered students.
    stu_qs = filter_marks_queryset_for_user(Marks.objects.all(), request.user).values_list(
        'student__student_class', flat=True
    )
    class_names = sorted(set(str(c).strip() for c in stu_qs if str(c).strip()))

    base = filter_marks_queryset_for_user(
        Marks.objects.select_related('subject', 'exam_type', 'student'),
        request.user,
    )
    if allowed_subject_ids is not None:
        base = base.filter(subject_id__in=allowed_subject_ids)
    if exam_slug:
        base = base.filter(exam_type__slug=exam_slug)

    pct_expr = ExpressionWrapper(
        F('marks_obtained') * 100.0 / F('total_marks'),
        output_field=FloatField(),
    )

    rows = []
    for cn in class_names:
        qs = base.filter(student__student_class=cn).annotate(pct=pct_expr)
        agg = qs.aggregate(avg_pct=Avg('pct'), n=Count('id'))
        rows.append(
            {
                'class_name': cn,
                'average_percentage': round(float(agg['avg_pct'] or 0), 1),
                'entries': int(agg['n'] or 0),
            }
        )

    # Provide subject labels for UI badges
    subject_names = []
    if allowed_subject_ids is not None:
        subject_names = list(
            Subject.objects.filter(id__in=allowed_subject_ids).order_by('name').values_list('name', flat=True)
        )

    return Response(
        {
            'exam_type': exam_slug or None,
            'subjects': subject_names,
            'classes': class_names,
            'class_rows': rows,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def teacher_workload_summary(request):
    """
    GET /api/teacher/workload/

    Summary for subject teachers (and other staff): number of classes, students, and recent marks activity.
    """
    user = request.user
    prof = get_profile(user)
    if not prof:
        return _forbidden('No staff profile for this account.')

    # Students in scope (already class-filtered for teachers).
    stu_qs = __import__('api.models', fromlist=['Student']).Student.objects.all()
    stu_qs = __import__('api.rbac', fromlist=['filter_student_queryset_for_user']).filter_student_queryset_for_user(
        stu_qs, user
    )

    marks_qs = filter_marks_queryset_for_user(Marks.objects.all(), user)
    from django.utils import timezone

    today = timezone.localdate()
    start = today - timezone.timedelta(days=30)
    recent_marks = marks_qs.filter(exam_date__gte=start, exam_date__lte=today).count()

    class_names = sorted(
        set(
            str(c).strip()
            for c in stu_qs.values_list('student_class', flat=True)
            if str(c).strip()
        )
    )

    subjects = []
    if prof.role == UserProfile.Role.SUBJECT_TEACHER:
        try:
            subjects = list(prof.assigned_subjects.order_by('name').values_list('name', flat=True))
        except Exception:
            subjects = []
        if not subjects and prof.assigned_subject:
            subjects = [prof.assigned_subject.name]

    return Response(
        {
            'role': prof.role,
            'subjects': subjects,
            'classes': class_names,
            'students_in_scope': stu_qs.count(),
            'marks_entries_last_30_days': recent_marks,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def marks_distribution(request):
    """
    GET /api/marks/distribution/?class_name=&exam_type=

    Per-subject aggregates for one class and exam: averages, high/low, pass/fail %.
    Pass = marks_obtained >= 40% of total marks for that exam type.
    """
    class_name = (request.query_params.get('class_name') or '').strip()
    exam_slug = (request.query_params.get('exam_type') or '').strip().upper()

    if not class_name:
        return Response(
            {'detail': 'Query param class_name is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not exam_slug:
        return Response(
            {'detail': 'Query param exam_type is required (UNIT_TEST, MID_SEM, SEMESTER).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not ExamType.objects.filter(slug=exam_slug).exists():
        return Response(
            {'detail': f'Unknown exam_type: {exam_slug!r}.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not user_can_access_class(request.user, class_name):
        return _forbidden('You do not have access to this class.')

    prof = get_profile(request.user)
    if prof and prof.role == UserProfile.Role.SUBJECT_TEACHER:
        if not prof.assigned_subject_id:
            return _forbidden('No subject assigned to your profile.')
    elif not user_can_access_class_results(request.user, class_name):
        return _forbidden('You do not have access to class-wide results for this class.')

    try:
        max_marks = float(total_marks_for_exam_slug(exam_slug))
    except Exception:
        max_marks = 0.0

    exam_obj = ExamType.objects.get(slug=exam_slug)
    base = Marks.objects.filter(
        student__student_class=class_name,
        exam_type__slug=exam_slug,
    ).select_related('subject', 'exam_type')
    if prof and prof.role == UserProfile.Role.SUBJECT_TEACHER and prof.assigned_subject_id:
        base = base.filter(subject_id=prof.assigned_subject_id)

    pairs = (
        base.order_by('subject__name')
        .values_list('subject_id', 'subject__name')
        .distinct()
    )

    subjects_out = []
    for subject_id, subject_name in pairs:
        subqs = base.filter(subject_id=subject_id)
        agg = subqs.aggregate(
            avg_marks=Avg('marks_obtained'),
            highest=Max('marks_obtained'),
            lowest=Min('marks_obtained'),
            n=Count('id'),
        )
        n = int(agg['n'] or 0)
        if n == 0:
            continue
        avg_m = float(agg['avg_marks'] or 0)
        hi = float(agg['highest'] or 0)
        lo = float(agg['lowest'] or 0)
        pass_line = ExpressionWrapper(
            F('total_marks') * Value(PASS_MARKS_FRACTION, output_field=FloatField()),
            output_field=FloatField(),
        )
        passed = subqs.filter(marks_obtained__gte=pass_line).count()
        fail_count = n - passed
        pass_pct = round(100.0 * passed / n, 1)
        fail_pct = round(100.0 * fail_count / n, 1)
        avg_pct = round(100.0 * avg_m / max_marks, 1) if max_marks else 0.0

        subjects_out.append(
            {
                'subject': subject_name or 'Unknown',
                'avg_marks': round(avg_m, 1),
                'avg_percentage': avg_pct,
                'highest': round(hi, 1),
                'lowest': round(lo, 1),
                'pass_percentage': pass_pct,
                'fail_percentage': fail_pct,
            }
        )

    total_students = base.values('student_id').distinct().count()

    if subjects_out:
        overall_class_average = round(
            sum(s['avg_percentage'] for s in subjects_out) / len(subjects_out),
            1,
        )
        best_row = max(subjects_out, key=lambda x: x['avg_marks'])
        weak_row = min(subjects_out, key=lambda x: x['avg_marks'])
        best_subject = best_row['subject']
        weakest_subject = weak_row['subject']
    else:
        overall_class_average = 0.0
        best_subject = None
        weakest_subject = None

    return Response(
        {
            'class_name': class_name,
            'exam_type': exam_slug,
            'exam_type_label': exam_obj.get_slug_display(),
            'pass_threshold_percent': int(PASS_MARKS_FRACTION * 100),
            'subjects': subjects_out,
            'summary': {
                'total_students': total_students,
                'overall_class_average': overall_class_average,
                'best_subject': best_subject,
                'weakest_subject': weakest_subject,
            },
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def marks_by_student(request, student_id):
    """GET /api/marks/<student_id>/ — all structured marks for a student."""
    student = get_object_or_404(Student, pk=student_id)
    if not user_can_access_student(request.user, student):
        return _forbidden('You do not have access to this student.')
    qs = filter_marks_queryset_for_user(
        Marks.objects.filter(student_id=student_id).select_related(
            'student', 'subject', 'exam_type'
        ),
        request.user,
    ).order_by('-exam_date', '-id')
    exam_type = (request.query_params.get('exam_type') or '').strip()
    if exam_type:
        qs = qs.filter(exam_type__slug=exam_type)
    data = MarksSerializer(qs, many=True).data
    summary = _summary_for_queryset(qs)
    return Response({'results': data, 'summary': summary})


def _summary_for_queryset(qs):
    rows = list(qs)
    total_obt = sum(float(r.marks_obtained) for r in rows)
    total_max = sum(float(r.total_marks) for r in rows)
    pct = percentage(total_obt, total_max) if total_max > 0 else 0.0
    return {
        'total_marks_obtained': round(total_obt, 2),
        'total_max_marks': round(total_max, 2),
        'percentage': pct,
        'grade': letter_grade(pct),
    }


@api_view(['GET', 'POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def marks_list_or_create(request):
    """
    GET: all structured marks (optional ?student=<id>).
    POST: create one row.
    """
    if request.method == 'GET':
        qs = filter_marks_queryset_for_user(
            Marks.objects.select_related('student', 'subject', 'exam_type'),
            request.user,
        ).order_by('-exam_date', '-id')
        sid = (request.query_params.get('student') or '').strip()
        if sid.isdigit():
            qs = qs.filter(student_id=int(sid))
        return Response(MarksSerializer(qs, many=True).data)

    ser = MarksSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    st = ser.validated_data.get('student')
    student = st if isinstance(st, Student) else get_object_or_404(Student, pk=st)
    subj = ser.validated_data.get('subject')
    subj_id = subj.pk if subj is not None else None
    denied = _assert_can_write_mark(request, student, subj_id)
    if denied:
        return denied
    row = ser.save()
    log_activity(
        request.user,
        ActivityLog.Action.MARKS_CREATE,
        target=f'marks:{row.id}',
        metadata={'student_id': row.student_id, 'subject_id': row.subject_id},
    )
    return Response(MarksSerializer(row).data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def marks_detail(request, pk):
    try:
        row = Marks.objects.select_related('student', 'subject', 'exam_type').get(pk=pk)
    except Marks.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    visible = filter_marks_queryset_for_user(Marks.objects.filter(pk=pk), request.user).exists()
    if not visible:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        return Response(MarksSerializer(row).data)

    if request.method == 'DELETE':
        denied = _assert_can_write_mark(request, row.student, row.subject_id)
        if denied:
            return denied
        rid, sid, subid = row.id, row.student_id, row.subject_id
        row.delete()
        log_activity(
            request.user,
            ActivityLog.Action.MARKS_DELETE,
            target=f'marks:{rid}',
            metadata={'student_id': sid, 'subject_id': subid},
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == 'PATCH'
    ser = MarksSerializer(row, data=request.data, partial=partial)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
    st = ser.validated_data.get('student', row.student)
    student = st if isinstance(st, Student) else get_object_or_404(Student, pk=st)
    subj = ser.validated_data.get('subject', row.subject)
    subj_id = subj.pk if subj is not None else row.subject_id
    denied = _assert_can_write_mark(request, student, subj_id)
    if denied:
        return denied
    ser.save()
    log_activity(
        request.user,
        ActivityLog.Action.MARKS_UPDATE,
        target=f'marks:{row.id}',
        metadata={'student_id': row.student_id, 'subject_id': row.subject_id},
    )
    return Response(ser.data)
