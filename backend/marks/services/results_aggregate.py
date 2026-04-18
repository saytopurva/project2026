"""Aggregate marks into class ranks, percentages, and per-student report payloads."""

from __future__ import annotations

from typing import Any

from django.shortcuts import get_object_or_404

from api.models import AcademicDetails, Student

from ..models import ExamType, Marks
from .grading import letter_grade, percentage as pct_fn


def _exam_label(exam: ExamType) -> str:
    return exam.get_slug_display()


def aggregate_student_exam(student_id: int, exam_slug: str) -> dict[str, Any]:
    """Subject rows + totals for one student and exam type."""
    exam = get_object_or_404(ExamType, slug=exam_slug.upper())
    rows = (
        Marks.objects.filter(student_id=student_id, exam_type=exam)
        .select_related('subject')
        .order_by('subject__name')
    )
    subjects: list[dict[str, Any]] = []
    total_obt = 0.0
    total_max = 0.0
    for m in rows:
        tm = float(m.total_marks or 0)
        mo = float(m.marks_obtained or 0)
        total_obt += mo
        total_max += tm
        p = pct_fn(mo, tm)
        subjects.append(
            {
                'subject': m.subject.name,
                'marks_obtained': round(mo, 2),
                'total_marks': round(tm, 2),
                'percentage': p,
                'grade': letter_grade(p),
            }
        )
    pct = pct_fn(total_obt, total_max) if total_max > 0 else 0.0
    return {
        'exam': exam,
        'exam_slug': exam.slug,
        'subjects': subjects,
        'total_marks_obtained': round(total_obt, 2),
        'total_marks_max': round(total_max, 2),
        'percentage': pct,
        'grade': letter_grade(pct),
    }


def competition_ranks(sorted_totals: list[tuple[int, float]]) -> dict[int, int]:
    """1-based competition ranking: ties share the same rank, next rank skips."""
    ranks: dict[int, int] = {}
    prev_score = None
    current_rank = 0
    for pos, (sid, total) in enumerate(sorted_totals, start=1):
        if prev_score is None or total != prev_score:
            current_rank = pos
            prev_score = total
        ranks[sid] = current_rank
    return ranks


def build_class_results(class_name: str, exam_slug: str) -> tuple[ExamType, list[dict[str, Any]]]:
    """All students in class with totals and ranks for one exam."""
    exam = get_object_or_404(ExamType, slug=exam_slug.upper())
    students = list(Student.objects.filter(student_class=class_name).order_by('roll_no', 'id'))
    agg_by_id: dict[int, dict[str, Any]] = {}
    totals_list: list[tuple[int, float]] = []

    for st in students:
        agg = aggregate_student_exam(st.id, exam.slug)
        agg_by_id[st.id] = agg
        totals_list.append((st.id, float(agg['total_marks_obtained'])))

    sorted_totals = sorted(totals_list, key=lambda x: (-x[1], x[0]))
    rank_map = competition_ranks(sorted_totals)

    out: list[dict[str, Any]] = []
    for st in students:
        agg = agg_by_id[st.id]
        out.append(
            {
                'student_id': st.id,
                'name': st.name,
                'roll_no': st.roll_no,
                'total_marks_obtained': agg['total_marks_obtained'],
                'total_marks_max': agg['total_marks_max'],
                'percentage': agg['percentage'],
                'grade': agg['grade'],
                'rank': rank_map[st.id],
            }
        )
    return exam, out


def student_result_detail(student_id: int, exam_slug: str) -> dict[str, Any]:
    """Full detail payload for API + PDF."""
    student = get_object_or_404(Student, pk=student_id)
    exam = get_object_or_404(ExamType, slug=exam_slug.upper())
    agg = aggregate_student_exam(student_id, exam.slug)

    class_name = student.student_class
    _, class_rows = build_class_results(class_name, exam.slug)
    row = next((r for r in class_rows if r['student_id'] == student_id), None)
    rank = row['rank'] if row else 1
    total_in_class = Student.objects.filter(student_class=class_name).count()

    remarks = ''
    try:
        remarks = (student.academic.teacher_remarks or '').strip()
    except AcademicDetails.DoesNotExist:
        remarks = ''

    return {
        'student': {
            'id': student.id,
            'name': student.name,
            'student_class': student.student_class,
            'roll_no': student.roll_no,
        },
        'exam_type': exam.slug,
        'exam_type_label': _exam_label(exam),
        'subjects': agg['subjects'],
        'total_marks_obtained': agg['total_marks_obtained'],
        'total_marks_max': agg['total_marks_max'],
        'percentage': agg['percentage'],
        'grade': agg['grade'],
        'rank': rank,
        'total_in_class': total_in_class,
        'teacher_remarks': remarks,
    }
