from django.urls import path

from . import views

urlpatterns = [
    path('attendance/report/<int:student_id>/', views.attendance_monthly_report),
    path('send-report/<int:student_id>/', views.send_attendance_report),
]
