from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'tracker'

router = DefaultRouter()
router.register(r'cycles', views.CycleLogViewSet, basename='cycle')
router.register(r'daily', views.DailyLogViewSet, basename='daily')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', views.DashboardAPIView.as_view(), name='dashboard'),
]
