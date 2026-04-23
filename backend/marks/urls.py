from django.urls import path

from . import views
from . import views_results

urlpatterns = [
    path('results/<int:student_id>/pdf/', views_results.results_pdf),
    path('results/<int:student_id>/send/', views_results.results_send),
    path('results/<int:student_id>/', views_results.results_detail),
    path('results/', views_results.results_list),
    path('analytics/subject-performance/', views.subject_performance_analytics),
    path('teacher/subject-analytics/', views.teacher_subject_analytics),
    path('teacher/workload/', views.teacher_workload_summary),
    path('subjects/', views.subject_list),
    path('exam-types/', views.exam_type_list),
    path('marks/distribution/', views.marks_distribution),
    # Student-scoped list must be registered before marks/<pk>/ (both are numeric).
    path('marks/student/<int:student_id>/', views.marks_by_student),
    path('marks/<int:pk>/', views.marks_detail),
    path('marks/', views.marks_list_or_create),
]
