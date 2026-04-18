from django.contrib import admin

from .models import AttendanceReportSendLog


@admin.register(AttendanceReportSendLog)
class AttendanceReportSendLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'year', 'month', 'status', 'sent_at', 'recipient_email')
    list_filter = ('status', 'year', 'month')
