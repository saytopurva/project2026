from django.contrib import admin
from .models import (
    AcademicDetails,
    Certificate,
    Event,
    FeesDetails,
    LoginOTP,
    Notice,
    ParentDetails,
    SchoolClass,
    Student,
    ClassSchedule,
    Substitution,
    UserProfile,
)


admin.site.register(Student)
admin.site.register(Notice)
admin.site.register(Event)
admin.site.register(ParentDetails)
admin.site.register(AcademicDetails)
admin.site.register(FeesDetails)
admin.site.register(Certificate)
admin.site.register(ClassSchedule)
admin.site.register(Substitution)
admin.site.register(SchoolClass)


@admin.register(LoginOTP)
class LoginOTPAdmin(admin.ModelAdmin):
    list_display = ('email', 'created_at', 'expires_at', 'is_used', 'verify_attempts')
    list_filter = ('is_used',)
    search_fields = ('email',)
    readonly_fields = ('email', 'otp', 'created_at', 'expires_at', 'is_used', 'verify_attempts')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'role',
        'approval_status',
        'assigned_class',
        'assigned_subject',
        'avatar_url',
    )
    list_filter = ('role', 'approval_status')
    search_fields = ('user__email', 'user__username', 'assigned_class')
    raw_id_fields = ('user', 'assigned_subject')
    filter_horizontal = ('assigned_classes', 'assigned_subjects')
