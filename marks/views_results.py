"""Result list/detail, PDF report card, parent email & WhatsApp link."""

from __future__ import annotations

import re
from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.models import Student

from .models import ExamType
from .pdf_reportcard import build_reportcard_pdf
from .services.results_aggregate import build_class_results, student_result_detail


def _exam_slug(request) -> str:
    return (request.query_params.get('exam_type') or request.data.get('exam_type') or '').strip().upper()


def _whatsapp_phone(raw: str) -> str | None:
    if not raw:
        return None
    digits = re.sub(r'\D', '', raw)
    if len(digits) < 10:
        return None
    return digits


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def results_list(request):
    """
    GET /api/results/?class_name=&exam_type=

    List students in class with totals, percentage, grade, rank.
    """
    class_name = (request.query_params.get('class_name') or '').strip()
    exam_slug = _exam_slug(request)
    if not class_name:
        return Response({'detail': 'Query param class_name is required.'}, status=status.HTTP_400_BAD_REQUEST)
    if not exam_slug:
        return Response(
            {'detail': 'Query param exam_type is required (UNIT_TEST, MID_SEM, SEMESTER).'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not ExamType.objects.filter(slug=exam_slug).exists():
        return Response({'detail': f'Unknown exam_type: {exam_slug!r}.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        exam_obj, rows = build_class_results(class_name, exam_slug)
    except ExamType.DoesNotExist:
        return Response({'detail': 'Invalid exam type.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(
        {
            'class_name': class_name,
            'exam_type': exam_slug,
            'exam_type_label': exam_obj.get_slug_display(),
            'students': rows,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def results_detail(request, student_id: int):
    """
    GET /api/results/{student_id}/?exam_type=

    Full result with subject rows, rank, remarks.
    """
    exam_slug = _exam_slug(request)
    if not exam_slug:
        return Response(
            {'detail': 'Query param exam_type is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not ExamType.objects.filter(slug=exam_slug).exists():
        return Response({'detail': f'Unknown exam_type: {exam_slug!r}.'}, status=status.HTTP_400_BAD_REQUEST)
    detail = student_result_detail(student_id, exam_slug)
    if not detail:
        return Response({'detail': 'Student or result not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(detail)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def results_pdf(request, student_id: int):
    """
    GET /api/results/{student_id}/pdf/?exam_type=
    """
    exam_slug = _exam_slug(request)
    if not exam_slug:
        return Response({'detail': 'Query param exam_type is required.'}, status=status.HTTP_400_BAD_REQUEST)
    pdf_bytes = build_reportcard_pdf(student_id, exam_slug)
    if not pdf_bytes:
        return Response({'detail': 'Could not build PDF.'}, status=status.HTTP_404_NOT_FOUND)
    st = Student.objects.filter(pk=student_id).first()
    safe = re.sub(r'[^\w\-]', '_', st.name if st else str(student_id))[:40]
    filename = f'report_{safe}_{exam_slug}.pdf'
    resp = HttpResponse(pdf_bytes, content_type='application/pdf')
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def results_send(request, student_id: int):
    """
    POST /api/results/{student_id}/send/
    Body: { "exam_type": "UNIT_TEST" }

    Email PDF to parent_email; return whatsapp_url for parent_phone.
    """
    exam_slug = _exam_slug(request)
    if not exam_slug:
        return Response(
            {'detail': 'Field exam_type is required in JSON body or query.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not ExamType.objects.filter(slug=exam_slug).exists():
        return Response({'detail': f'Unknown exam_type: {exam_slug!r}.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        student = Student.objects.get(pk=student_id)
    except Student.DoesNotExist:
        return Response({'detail': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

    detail = student_result_detail(student_id, exam_slug)
    if not detail:
        return Response({'detail': 'No marks for this exam.'}, status=status.HTTP_400_BAD_REQUEST)

    pdf_bytes = build_reportcard_pdf(student_id, exam_slug)
    if not pdf_bytes:
        return Response({'detail': 'Could not build PDF.'}, status=status.HTTP_400_BAD_REQUEST)

    exam_label = detail['exam_type_label']
    school = getattr(settings, 'SCHOOL_NAME', 'School')
    base = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:3000').rstrip('/')
    profile_url = f'{base}/student/{student_id}'

    email_sent = False
    parent_email = (student.parent_email or '').strip()
    if parent_email:
        try:
            msg = EmailMessage(
                subject=f'{school} — Report card ({exam_label}) — {student.name}',
                body=(
                    f'Dear Parent/Guardian,\n\n'
                    f'Please find attached the report card for {student.name} '
                    f'(Class {student.student_class}, Roll {student.roll_no}) '
                    f'for {exam_label}.\n\n'
                    f'Rank in class: {detail["rank"]} of {detail["total_in_class"]}.\n'
                    f'Overall: {detail["percentage"]:.2f}% (Grade {detail["grade"]}).\n\n'
                    f'— {school}\n'
                ),
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                to=[parent_email],
            )
            safe = re.sub(r'[^\w\-]', '_', student.name)[:40]
            msg.attach(f'report_{safe}_{exam_slug}.pdf', pdf_bytes, 'application/pdf')
            msg.send(fail_silently=False)
            email_sent = True
        except Exception:
            email_sent = False

    wa_phone = _whatsapp_phone(student.parent_phone or '')
    message = (
        f'Your child *{student.name}* report for *{exam_label}* is ready. '
        f'Overall: *{detail["percentage"]:.1f}%* (Grade {detail["grade"]}, Rank {detail["rank"]}/{detail["total_in_class"]}). '
        f'PDF has been emailed to the registered address when available. '
        f'Portal: {profile_url}'
    )
    whatsapp_url = None
    if wa_phone:
        whatsapp_url = f'https://wa.me/{wa_phone}?text={quote(message)}'

    return Response(
        {
            'email_sent': email_sent,
            'parent_email': parent_email or None,
            'whatsapp_url': whatsapp_url,
            'message': message,
        }
    )
