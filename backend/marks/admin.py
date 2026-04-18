from django.contrib import admin

from .models import ExamType, Marks, Subject


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(ExamType)
class ExamTypeAdmin(admin.ModelAdmin):
    list_display = ('id', 'slug')


@admin.register(Marks)
class MarksAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'subject', 'exam_type', 'marks_obtained', 'total_marks', 'exam_date')
    list_filter = ('exam_type', 'exam_date')
    search_fields = ('student__name', 'subject__name')
    raw_id_fields = ('student', 'subject', 'exam_type')
    readonly_fields = ('total_marks',)
