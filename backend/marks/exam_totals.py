"""Fixed max scores per exam type (single source of truth for Marks.total_marks)."""

from django.core.exceptions import ValidationError

# Slug → max marks (must match ExamType.slug / ExamType.Name)
EXAM_TOTAL_MARKS = {
    'UNIT_TEST': 20.0,
    'MID_SEM': 50.0,
    'SEMESTER': 100.0,
}


def total_marks_for_exam_slug(slug: str) -> float:
    try:
        return float(EXAM_TOTAL_MARKS[slug])
    except KeyError as e:
        raise ValidationError({'exam_type': f'Unsupported exam type: {slug!r}.'}) from e


def total_marks_for_exam_type(exam_type) -> float:
    return total_marks_for_exam_slug(exam_type.slug)
