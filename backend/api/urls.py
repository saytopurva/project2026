from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

urlpatterns = [
    path('health/', views.health_check),
    path('auth/register/', views.register),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.current_user_me),
    path('users/create-teacher/', views.create_teacher),
    path('students/classes/', views.list_student_classes),
    path('students/', views.get_students),
    path('students/class/<path:class_name>/', views.students_by_class),
    path('students/<int:pk>/', views.student_detail),
    path('add-student/', views.add_student),
    path('students/<int:pk>/certificates/', views.student_certificates_create),
    path('certificates/<int:pk>/', views.student_certificate_delete),
    path('', include('attendance.urls')),
    path('notices/', views.notices_list_create),
    path('notices/<int:pk>/', views.notice_delete),
    path('events/', views.events_list_create),
    path('events/<int:pk>/', views.event_delete),
    path('dashboard/stats/', views.dashboard_stats),
    path('dashboard/overview/', views.dashboard_overview),
    path('', include('marks.urls')),
    path('', include('reports.urls')),
]
