from django.db import models
from django.conf import settings


class Insight(models.Model):
    """Generated health insights for users."""
    
    SEVERITY_CHOICES = [
        ('info', 'Information'),
        ('tip', 'Tip'),
        ('warning', 'Warning'),
        ('alert', 'Alert'),
    ]
    
    CATEGORY_CHOICES = [
        ('cycle', 'Cycle Pattern'),
        ('pain', 'Pain Pattern'),
        ('mood', 'Mood Pattern'),
        ('flow', 'Flow Pattern'),
        ('lifestyle', 'Lifestyle'),
        ('risk', 'Health Risk'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='insights'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='info')
    category = models.CharField(max_length=15, choices=CATEGORY_CHOICES, default='cycle')
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'insights'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.severity}: {self.title}"


class Recommendation(models.Model):
    """Personalized recommendations."""
    
    TYPE_CHOICES = [
        ('diet', 'Diet'),
        ('exercise', 'Exercise'),
        ('sleep', 'Sleep'),
        ('productivity', 'Productivity'),
        ('selfcare', 'Self Care'),
        ('general', 'General'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='recommendations'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    recommendation_type = models.CharField(max_length=15, choices=TYPE_CHOICES, default='general')
    phase = models.CharField(max_length=15, blank=True, default='')
    icon = models.CharField(max_length=10, default='💡')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'insights'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.recommendation_type}: {self.title}"
