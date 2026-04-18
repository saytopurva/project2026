"""Percentage → letter grade helpers (reusable across serializers and reports)."""


def percentage(marks_obtained: float, total_marks: float) -> float:
    if total_marks <= 0:
        return 0.0
    return round(100.0 * float(marks_obtained) / float(total_marks), 2)


def letter_grade(pct: float) -> str:
    if pct >= 90:
        return 'A+'
    if pct >= 80:
        return 'A'
    if pct >= 70:
        return 'B+'
    if pct >= 60:
        return 'B'
    if pct >= 50:
        return 'C'
    if pct >= 40:
        return 'D'
    return 'F'
