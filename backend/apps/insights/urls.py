from django.urls import path
from . import views

app_name = 'insights'

urlpatterns = [
    path('', views.InsightsView.as_view(), name='insights'),
    path('<int:pk>/dismiss/', views.DismissInsightView.as_view(), name='dismiss'),
    path('recommendations/', views.RecommendationsView.as_view(), name='recommendations'),
]
