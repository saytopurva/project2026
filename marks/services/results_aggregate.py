"""Class result sheets: aggregate marks, grades, competition ranking."""

from __future__ import annotations

from typing import Any

from django.db.models import QuerySet

from api.models import AcademicDetails, Student
from marks.models import ExamType, Marks
from marks.services.grading import letter_grade, percentage


def _remarks_for_student(student: Student) -> str:
    try:
        return (student.academic.teacher_remarks or '').strip()
    except AcademicDetails.DoesNotExist:
        return ''


def aggregate_student_exam(student: Student, exam_slug: str) -> dict[str, Any]:
    """Sum subject marks for one student + one exam type."""
    qs: QuerySet[Marks] = Marks.objects.filter(
        student=student,
        exam_type__slug=exam_slug,
    ).select_related('subject', 'exam_type')
    subjects: list[dict[str, Any]] = []
    tot_o = tot_m = 0.0
    for m in qs.order_by('subject__name'):
        mo = float(m.marks_obtained)
        tm = float(m.total_marks)
        tot_o += mo
        tot_m += tm
        sp = percentage(mo, tm)
        subjects.append(
            {
                'subject': m.subject.name,
                'marks_obtained': round(mo, 1),
                'total_marks': tm,
                'percentage': sp,
                'grade': letter_grade(sp),
                'exam_date': str(m.exam_date),
            }
        )
    overall_pct = percentage(tot_o, tot_m) if tot_m > 0 else 0.0
    return {
        'total_marks_obtained': round(tot_o, 2),
        'total_marks_max': round(tot_m, 2),
        'percentage': overall_pct,
        'grade': letter_grade(overall_pct),
        'subjects': subjects,
        'teacher_remarks': _remarks_for_student(student),
    }


def competition_ranks(rows: list[dict[str, Any]]) -> None:
    """
    Mutates rows in place with 'rank' key (competition ranking: 1,2,2,4).
    """
    sorted_rows = sorted(
        rows,
        key=lambda r: (-float(r['percentage']), -float(r['total_marks_obtained'])),
    )
    rank = 1
    for i, row in enumerate(sorted_rows):
        key = (float(row['percentage']), float(row['total_marks_obtained']))
        if i > 0:
            prev = sorted_rows[i - 1]
            pkey = (float(prev['percentage']), float(prev['total_marks_obtained']))
            if key != pkey:
                rank = i + 1
        else:
            rank = 1
        row['rank'] = rank


def build_class_results(class_name: str, exam_slug: str) -> tuple[ExamType, list[dict[str, Any]]]:
    """All students in class with aggregates and ranks."""
    exam = ExamType.objects.get(slug=exam_slug)
    students = Student.objects.filter(student_class=class_name).order_by('roll_no', 'id')
    rows: list[dict[str, Any]] = []
    for st in students:
        agg = aggregate_student_exam(st, exam_slug)
        rows.append(
            {
                'student_id': st.id,
                'name': st.name,
                'roll_no': st.roll_no,
                'parent_email': st.parent_email or '',
                'parent_phone': st.parent_phone or '',
                'total_marks_obtained': agg['total_marks_obtained'],
                'total_marks_max': agg['total_marks_max'],
                'percentage': agg['percentage'],
                'grade': agg['grade'],
                'subjects_count': len(agg['subjects']),
            }
        )
    competition_ranks(rows)
    return exam, rows


def student_result_detail(student_id: int, exam_slug: str) -> dict[str, Any] | None:
    """Full detail including rank within class."""
    try:
        student = Student.objects.get(pk=student_id)
    except Student.DoesNotExist:
        return None
    class_name = student.student_class
    if not class_name:
        return None
    if not ExamType.objects.filter(slug=exam_slug).exists():
        return None
    exam, class_rows = build_class_results(class_name, exam_slug)
    mine = next((r for r in class_rows if r['student_id'] == student_id), None)
    if not mine:
        return None
    agg = aggregate_student_exam(student, exam_slug)
    total_in_class = len(class_rows)
    return {
        'student': {
            'id': student.id,
            'name': student.name,
            'email': student.email,
            'roll_no': student.roll_no,
            'student_class': class_name,
            'parent_email': student.parent_email or '',
            'parent_phone': student.parent_phone or '',
        },
        'exam_type': exam.slug,
        'exam_type_label': exam.get_slug_display(),
        'class_name': class_name,
        'total_in_class': total_in_class,
        'rank': mine['rank'],
        'total_marks_obtained': agg['total_marks_obtained'],
        'total_marks_max': agg['total_marks_max'],
        'percentage': agg['percentage'],
        'grade': agg['grade'],
        'subjects': agg['subjects'],
        'teacher_remarks': agg['teacher_remarks'],
    }
