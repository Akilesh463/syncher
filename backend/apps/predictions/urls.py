from django.urls import path
from . import views

app_name = 'predictions'

urlpatterns = [
    path('predict/', views.PredictView.as_view(), name='predict'),
    path('train/', views.TrainModelView.as_view(), name='train'),
    path('symptom-analytics/', views.SymptomAnalyticsView.as_view(), name='symptom-analytics'),
]
