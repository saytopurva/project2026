"""Results API: class list, student detail, PDF, parent email + WhatsApp."""

from __future__ import annotations

import re
from urllib.parse import quote

from django.conf import settings
from django.core.mail import EmailMessage
from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.models import Student, UserProfile
from api.rbac import (
    get_profile,
    user_can_access_class_results,
    user_can_access_student,
    user_can_edit_student_record,
)

from .pdf_reportcard import build_reportcard_pdf
from .services.grading import letter_grade, percentage as pct_fn
from .services.results_aggregate import build_class_results, student_result_detail


def _sanitize_filename(s: str) -> str:
    return re.sub(r'[^\w.\-]+', '_', s)[:120] or 'report'


def _narrow_result_payload_for_subject_teacher(user, detail: dict) -> dict:
    """Strip class rank and non-assigned subjects for subject teachers."""
    p = get_profile(user)
    if (
        not p
        or p.role != UserProfile.Role.SUBJECT_TEACHER
        or not p.assigned_subject_id
        or not p.assigned_subject
    ):
        return detail
    subj_name = p.assigned_subject.name
    subs = [s for s in detail['subjects'] if s['subject'] == subj_name]
    tot_obt = sum(float(s['marks_obtained']) for s in subs)
    tot_max = sum(float(s['total_marks']) for s in subs)
    pct = pct_fn(tot_obt, tot_max) if tot_max > 0 else 0.0
    return {
        **detail,
        'subjects': subs,
        'total_marks_obtained': round(tot_obt, 2),
        'total_marks_max': round(tot_max, 2),
        'percentage': pct,
        'grade': letter_grade(pct),
        'rank': None,
        'total_in_class': None,
        'teacher_remarks': '',
    }


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def results_list(request):
    """
    GET /api/results/?class_name=&exam_type=
    """
    class_name = (request.query_params.get('class_name') or '').strip()
    exam_slug = (request.query_params.get('exam_type') or '').strip().upper()
    if not class_name or not exam_slug:
        return Response(
            {'detail': 'Query params class_name and exam_type are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not user_can_access_class_results(request.user, class_name):
        return Response(
            {'detail': 'You do not have access to class-wide results for this class.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        exam, students = build_class_results(class_name, exam_slug)
    except Http404 as e:
        return Response({'detail': str(e) or 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(
        {
            'class_name': class_name,
            'exam_type': exam.slug,
            'exam_type_label': exam.get_slug_display(),
            'students': students,
        }
    )


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def results_detail(request, student_id: int):
    """
    GET /api/results/{student_id}/?exam_type=
    """
    exam_slug = (request.query_params.get('exam_type') or '').strip().upper()
    if not exam_slug:
        return Response(
            {'detail': 'Query param exam_type is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    student = get_object_or_404(Student, pk=student_id)
    if not user_can_access_student(request.user, student):
        return Response(
            {'detail': 'You do not have access to this student.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        data = student_result_detail(int(student_id), exam_slug)
    except Http404 as e:
        return Response({'detail': str(e) or 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    data = _narrow_result_payload_for_subject_teacher(request.user, data)
    return Response(data)


@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def results_pdf(request, student_id: int):
    """
    GET /api/results/{student_id}/pdf/?exam_type=
    """
    exam_slug = (request.query_params.get('exam_type') or '').strip().upper()
    if not exam_slug:
        return Response(
            {'detail': 'Query param exam_type is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    student = get_object_or_404(Student, pk=student_id)
    if not user_can_access_student(request.user, student):
        return Response(
            {'detail': 'You do not have access to this student.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    try:
        detail = student_result_detail(int(student_id), exam_slug)
    except Http404 as e:
        return Response({'detail': str(e) or 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    detail = _narrow_result_payload_for_subject_teacher(request.user, detail)

    pdf_bytes = build_reportcard_pdf(detail)
    st = detail['student']
    fname = _sanitize_filename(f"report_{st.get('name', 'student')}_{detail.get('exam_type', 'exam')}.pdf")

    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{fname}"'
    return response


def _whatsapp_digits(phone: str) -> str | None:
    digits = re.sub(r'\D', '', phone or '')
    if len(digits) < 10:
        return None
    return digits


@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def results_send(request, student_id: int):
    """
    POST /api/results/{student_id}/send/
    Body: { "exam_type": "UNIT_TEST" }

    Emails PDF to parent_email; returns whatsapp_url when parent_phone is usable.
    """
    exam_slug = (request.data.get('exam_type') or '').strip().upper()
    if not exam_slug:
        return Response(
            {'detail': 'Field exam_type is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    student = get_object_or_404(Student, pk=student_id)
    if not user_can_access_student(request.user, student):
        return Response(
            {'detail': 'You do not have access to this student.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    if not user_can_edit_student_record(request.user, student):
        return Response(
            {'detail': 'Only administrators or the class teacher can send report cards.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        detail = student_result_detail(student.id, exam_slug)
    except Http404 as e:
        return Response({'detail': str(e) or 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
    detail = _narrow_result_payload_for_subject_teacher(request.user, detail)

    pdf_bytes = build_reportcard_pdf(detail)
    parent_email = (student.parent_email or '').strip()
    base = getattr(settings, 'FRONTEND_BASE_URL', 'http://localhost:5173').rstrip('/')
    profile_link = f'{base}/student/{student.id}?tab=results'

    student_name = student.name
    msg = (
        f'Your child {student_name}\'s result ({detail.get("exam_type_label", exam_slug)}) is ready. '
        f'View details: {profile_link}'
    )

    email_sent = False
    if parent_email:
        try:
            mail = EmailMessage(
                subject=f'Report card — {detail.get("exam_type_label", exam_slug)} — {student_name}',
                body=msg,
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', None),
                to=[parent_email],
            )
            fname = _sanitize_filename(f"report_{student_name}_{exam_slug}.pdf")
            mail.attach(fname, pdf_bytes, 'application/pdf')
            mail.send(fail_silently=False)
            email_sent = True
        except Exception:
            email_sent = False

    wa = None
    digits = _whatsapp_digits(student.parent_phone or '')
    if digits:
        wa = f'https://wa.me/{digits}?text={quote(msg)}'

    return Response(
        {
            'email_sent': email_sent,
            'parent_email': parent_email or None,
            'whatsapp_url': wa,
        }
    )
