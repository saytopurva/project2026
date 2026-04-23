from datetime import date as date_cls, timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import ClassSchedule, Substitution, UserProfile
from .permissions import IsAuthenticatedAndSmsApproved
from .rbac import get_profile, user_is_privileged
from .serializers_schedule import (
    AssignSubstitutionSerializer,
    ClassScheduleSerializer,
    FreeSlotSerializer,
    SubstitutionSerializer,
)

User = get_user_model()


def _today_day_code(today: date_cls) -> str:
    # Monday=0..Sunday=6; our schedule is Mon-Sat.
    m = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    return m[today.weekday()]


def _is_teacher(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    p = get_profile(user)
    if not p:
        return False
    return p.role in (UserProfile.Role.CLASS_TEACHER, UserProfile.Role.SUBJECT_TEACHER)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def schedule_today(request):
    """GET /api/schedule/today/ — today's timetable for the logged-in teacher."""
    if not _is_teacher(request.user) and not user_is_privileged(request.user):
        return Response({'detail': 'Teachers only.'}, status=status.HTTP_403_FORBIDDEN)

    today = timezone.localdate()
    day = _today_day_code(today)
    if day == 'SUN':
        return Response({'date': today.isoformat(), 'day': day, 'slots': []})

    qs = (
        ClassSchedule.objects.filter(teacher=request.user, day=day)
        .select_related('subject')
        .order_by('start_time', 'end_time', 'id')
    )
    return Response(
        {
            'date': today.isoformat(),
            'day': day,
            'slots': ClassScheduleSerializer(qs, many=True).data,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def schedule_week(request):
    """GET /api/schedule/week/ — week view (Mon-Sat) for the logged-in teacher."""
    if not _is_teacher(request.user) and not user_is_privileged(request.user):
        return Response({'detail': 'Teachers only.'}, status=status.HTTP_403_FORBIDDEN)

    today = timezone.localdate()
    # Monday of this week
    week_start = today - timedelta(days=today.weekday())
    # Mon-Sat only
    day_codes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    by_day = {c: [] for c in day_codes}
    qs = (
        ClassSchedule.objects.filter(teacher=request.user, day__in=day_codes)
        .select_related('subject')
        .order_by('day', 'start_time', 'end_time', 'id')
    )
    for row in qs:
        by_day[row.day].append(row)

    out = []
    for i, code in enumerate(day_codes):
        d = week_start + timedelta(days=i)
        out.append(
            {
                'date': d.isoformat(),
                'day': code,
                'slots': ClassScheduleSerializer(by_day[code], many=True).data,
            }
        )
    return Response({'week_start': week_start.isoformat(), 'days': out})


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def schedule_free_slots(request):
    """GET /api/schedule/free-slots/ — slots where this teacher is free today."""
    if not _is_teacher(request.user) and not user_is_privileged(request.user):
        return Response({'detail': 'Teachers only.'}, status=status.HTTP_403_FORBIDDEN)

    today = timezone.localdate()
    day = _today_day_code(today)
    if day == 'SUN':
        return Response({'date': today.isoformat(), 'day': day, 'free_slots': []})

    all_slots = (
        ClassSchedule.objects.filter(day=day)
        .values_list('start_time', 'end_time')
        .distinct()
        .order_by('start_time', 'end_time')
    )
    busy = set(
        ClassSchedule.objects.filter(teacher=request.user, day=day).values_list(
            'start_time', 'end_time'
        )
    )
    free = [{'start_time': s, 'end_time': e} for (s, e) in all_slots if (s, e) not in busy]
    return Response(
        {
            'date': today.isoformat(),
            'day': day,
            'free_slots': FreeSlotSerializer(free, many=True).data,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def substitution_list(request):
    """
    GET /api/substitution/
    - Principal/Vice Principal: see all pending substitutions for today
    - Teacher: see pending substitutions for today (unassigned) + ones assigned to them
    """
    today = timezone.localdate()
    qs = Substitution.objects.filter(date=today).select_related(
        'subject', 'original_teacher', 'substitute_teacher'
    )

    if user_is_privileged(request.user):
        qs = qs.order_by('start_time', 'end_time', 'class_name')
        return Response({'date': today.isoformat(), 'items': SubstitutionSerializer(qs, many=True).data})

    from django.db.models import Q

    if _is_teacher(request.user) and not user_is_privileged(request.user):
        qs = qs.filter(
            Q(substitute_teacher__isnull=True, status=Substitution.Status.PENDING)
            | Q(substitute_teacher=request.user, status=Substitution.Status.ASSIGNED)
        ).order_by('start_time', 'end_time', 'class_name')
        return Response({'date': today.isoformat(), 'items': SubstitutionSerializer(qs, many=True).data})

    return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticatedAndSmsApproved])
def substitution_assign(request):
    """
    POST /api/substitution/assign/
    Body: { substitution_id, substitute_teacher_id? }

    Rules:
    - Principal/Vice Principal can assign any teacher (substitute_teacher_id required)
    - Teacher can accept a substitution for themselves (substitute_teacher_id ignored)
    """
    ser = AssignSubstitutionSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    sub_id = ser.validated_data['substitution_id']
    try:
        row = Substitution.objects.select_related('subject').get(id=sub_id)
    except Substitution.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    if row.status == Substitution.Status.ASSIGNED and row.substitute_teacher_id:
        return Response({'detail': 'Already assigned.'}, status=status.HTTP_400_BAD_REQUEST)

    if user_is_privileged(request.user):
        tid = ser.validated_data.get('substitute_teacher_id')
        if not tid:
            return Response({'substitute_teacher_id': 'Required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            teacher = User.objects.get(id=tid)
        except User.DoesNotExist:
            return Response({'detail': 'Teacher not found.'}, status=status.HTTP_404_NOT_FOUND)
        row.substitute_teacher = teacher
        row.status = Substitution.Status.ASSIGNED
        row.save(update_fields=['substitute_teacher', 'status'])
        return Response({'detail': 'Assigned.', 'id': row.id}, status=status.HTTP_200_OK)

    if _is_teacher(request.user):
        row.substitute_teacher = request.user
        row.status = Substitution.Status.ASSIGNED
        row.save(update_fields=['substitute_teacher', 'status'])
        return Response({'detail': 'Accepted.', 'id': row.id}, status=status.HTTP_200_OK)

    return Response({'detail': 'Forbidden.'}, status=status.HTTP_403_FORBIDDEN)

