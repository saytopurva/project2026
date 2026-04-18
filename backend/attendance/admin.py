from django.contrib import admin

from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'date', 'status', 'marked_by', 'created_at')
    list_filter = ('status', 'date')
    search_fields = ('student__name', 'reason')
    raw_id_fields = ('student', 'marked_by')
