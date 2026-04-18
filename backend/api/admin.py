from django.contrib import admin
from .models import (
    AcademicDetails,
    Certificate,
    Event,
    FeesDetails,
    Notice,
    ParentDetails,
    Student,
)


admin.site.register(Student)
admin.site.register(Notice)
admin.site.register(Event)
admin.site.register(ParentDetails)
admin.site.register(AcademicDetails)
admin.site.register(FeesDetails)
admin.site.register(Certificate)

# Register your models here.
