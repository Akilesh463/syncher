"""SYNCHER URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/tracker/', include('apps.tracker.urls')),
    path('api/predictions/', include('apps.predictions.urls')),
    path('api/insights/', include('apps.insights.urls')),
    path('api/chat/', include('apps.chatbot.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
