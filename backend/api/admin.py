from django.contrib import admin
from .models import (
    AcademicDetails,
    Attendance,
    Certificate,
    Event,
    FeesDetails,
    Marks,
    Notice,
    ParentDetails,
    Student,
)


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'date', 'status', 'marked_by', 'created_at')
    list_filter = ('status', 'date')
    search_fields = ('student__name', 'leave_reason')
    raw_id_fields = ('student', 'marked_by')


admin.site.register(Student)
admin.site.register(Marks)
admin.site.register(Notice)
admin.site.register(Event)
admin.site.register(ParentDetails)
admin.site.register(AcademicDetails)
admin.site.register(FeesDetails)
admin.site.register(Certificate)

# Register your models here.
