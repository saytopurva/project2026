from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views
from . import views_auth
from . import views_schedule

urlpatterns = [
    path('health/', views.health_check),
    path('auth/send-otp/', views_auth.send_otp),
    path('auth/verify-otp/', views_auth.verify_otp),
    path('auth/google-login/', views_auth.google_login),
    path('auth/logout-all/', views_auth.logout_all_devices),
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.current_user_me),
    path('users/create-user/', views.create_school_user),
    path('users/create-teacher/', views.create_school_user),
    path('users/pending/', views.list_pending_users),
    path('users/<int:pk>/approve/', views.approve_pending_user),
    path('users/<int:pk>/reject/', views.reject_pending_user),
    path('users/<int:pk>/profile/', views.update_user_role),
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
    path('schedule/today/', views_schedule.schedule_today),
    path('schedule/week/', views_schedule.schedule_week),
    path('schedule/free-slots/', views_schedule.schedule_free_slots),
    path('substitution/', views_schedule.substitution_list),
    path('substitution/assign/', views_schedule.substitution_assign),
    path('', include('marks.urls')),
    path('', include('reports.urls')),
]
