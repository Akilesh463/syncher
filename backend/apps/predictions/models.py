from django.db import models
from django.conf import settings


class PredictionResult(models.Model):
    """Stores ML prediction results."""
    
    PHASE_CHOICES = [
        ('menstrual', 'Menstrual'),
        ('follicular', 'Follicular'),
        ('ovulation', 'Ovulation'),
        ('luteal', 'Luteal'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='predictions'
    )
    predicted_period_date = models.DateField()
    ovulation_date = models.DateField(null=True, blank=True)
    fertile_window_start = models.DateField(null=True, blank=True)
    fertile_window_end = models.DateField(null=True, blank=True)
    predicted_cycle_length = models.IntegerField(null=True, blank=True)
    confidence_score = models.FloatField(default=0.5)
    model_version = models.CharField(max_length=50, default='baseline_v1')
    current_phase = models.CharField(
        max_length=15, choices=PHASE_CHOICES, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'predictions'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Prediction {self.predicted_period_date} for {self.user.email}"
