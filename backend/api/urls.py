from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

urlpatterns = [
    path('auth/register/', views.register),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('students/', views.get_students),
    path('students/<int:pk>/', views.student_detail),
    path('add-student/', views.add_student),
    path('students/<int:pk>/certificates/', views.student_certificates_create),
    path('certificates/<int:pk>/', views.student_certificate_delete),
    path('attendance/export/', views.attendance_export),
    path('attendance/bulk/', views.attendance_bulk),
    path('attendance/student/<int:student_id>/', views.attendance_by_student),
    path('attendance/<int:pk>/', views.attendance_detail),
    path('attendance/', views.attendance_list_create),
    path('add-attendance/', views.attendance_list_create),
    path('marks/', views.get_marks),
    path('add-marks/', views.add_marks),
    path('notices/', views.notices_list_create),
    path('notices/<int:pk>/', views.notice_delete),
    path('events/', views.events_list_create),
    path('events/<int:pk>/', views.event_delete),
    path('dashboard/stats/', views.dashboard_stats),
    path('dashboard/overview/', views.dashboard_overview),
]
