from django.urls import path

from . import views

urlpatterns = [
    path('attendance/student/<int:student_id>/', views.attendance_by_student),
    path('attendance/summary/<int:student_id>/', views.attendance_monthly_summary),
    path('attendance/analytics/', views.attendance_analytics),
    path('attendance/bulk/', views.attendance_bulk),
    path('attendance/export/', views.attendance_export),
    path('attendance/<int:pk>/', views.attendance_detail),
    path('attendance/', views.attendance_list_create),
    path('add-attendance/', views.attendance_list_create),
]
