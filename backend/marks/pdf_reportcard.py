"""PDF report card (ReportLab)."""

from __future__ import annotations

from html import escape as html_escape
from io import BytesIO

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def _para_xml(text: str) -> str:
    """ReportLab Paragraph expects XML-safe text (escape &, <, >)."""
    return html_escape(str(text or ''), quote=False)


def build_reportcard_pdf(detail: dict) -> bytes:
    """Build PDF bytes from ``student_result_detail`` dict."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.2 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=6,
        textColor=colors.HexColor('#0f172a'),
    )
    sub_style = ParagraphStyle(
        'Sub',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#64748b'),
    )
    body = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
    )

    st = detail['student']
    school = _para_xml(getattr(settings, 'SCHOOL_NAME', 'School'))
    story = []

    story.append(Paragraph(school, title_style))
    story.append(Paragraph('Report card', sub_style))
    story.append(Spacer(1, 0.4 * cm))

    exam_label = _para_xml(detail.get('exam_type_label') or detail.get('exam_type', ''))
    meta = (
        f"<b>{_para_xml(st.get('name', ''))}</b> &nbsp;|&nbsp; Class {_para_xml(st.get('student_class', ''))} "
        f"&nbsp;|&nbsp; Roll {_para_xml(st.get('roll_no', ''))} &nbsp;|&nbsp; {exam_label}"
    )
    story.append(Paragraph(meta, body))
    story.append(
        Paragraph(
            f"Rank: <b>#{detail.get('rank')}</b> of {detail.get('total_in_class', '')} &nbsp;|&nbsp; "
            f"Percentage: <b>{float(detail.get('percentage', 0)):.2f}%</b> &nbsp;|&nbsp; "
            f"Grade: <b>{_para_xml(detail.get('grade', ''))}</b>",
            body,
        )
    )
    story.append(Spacer(1, 0.5 * cm))

    subjects = detail.get('subjects') or []
    table_data = [['Subject', 'Score', 'Max', '%', 'Grade']]
    for s in subjects:
        table_data.append(
            [
                str(s.get('subject', '') or ''),
                f"{s.get('marks_obtained', '')}",
                f"{s.get('total_marks', '')}",
                f"{float(s.get('percentage', 0)):.1f}",
                str(s.get('grade', '') or ''),
            ]
        )
    table_data.append(
        [
            'Total',
            f"{detail.get('total_marks_obtained', '')}",
            f"{detail.get('total_marks_max', '')}",
            f"{float(detail.get('percentage', 0)):.2f}",
            str(detail.get('grade', '') or ''),
        ]
    )

    tbl = Table(table_data, colWidths=[6.5 * cm, 2 * cm, 2 * cm, 2 * cm, 2 * cm])
    tbl.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#475569')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f8fafc')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ]
        )
    )
    story.append(tbl)
    story.append(Spacer(1, 0.6 * cm))

    remarks = (detail.get('teacher_remarks') or '').strip()
    if remarks:
        story.append(Paragraph('<b>Teacher remarks</b>', body))
        story.append(Paragraph(_para_xml(remarks), body))

    doc.build(story)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
