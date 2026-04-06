from django.db import models
from django.conf import settings


class CycleLog(models.Model):
    """Tracks individual menstrual cycles."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='cycles'
    )
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    cycle_length = models.IntegerField(
        null=True, blank=True,
        help_text='Days from this period start to next period start'
    )
    period_length = models.IntegerField(
        null=True, blank=True,
        help_text='Days of active bleeding'
    )
    is_predicted = models.BooleanField(default=False)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'tracker'
        ordering = ['-start_date']
        unique_together = ['user', 'start_date']
    
    def __str__(self):
        return f"Cycle {self.start_date} - {self.user.email}"


class DailyLog(models.Model):
    """Daily health tracking entries."""
    
    PERIOD_STATUS_CHOICES = [
        ('none', 'No Period'),
        ('started', 'Period Started'),
        ('ongoing', 'Period Ongoing'),
        ('ended', 'Period Ended'),
    ]
    
    MOOD_CHOICES = [
        ('happy', 'Happy'),
        ('calm', 'Calm'),
        ('energetic', 'Energetic'),
        ('low', 'Low'),
        ('irritated', 'Irritated'),
        ('anxious', 'Anxious'),
        ('sad', 'Sad'),
    ]
    
    FLOW_CHOICES = [
        ('none', 'None'),
        ('spotting', 'Spotting'),
        ('light', 'Light'),
        ('medium', 'Medium'),
        ('heavy', 'Heavy'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='daily_logs'
    )
    date = models.DateField()
    period_status = models.CharField(
        max_length=10, choices=PERIOD_STATUS_CHOICES, default='none'
    )
    pain_level = models.IntegerField(
        default=0, help_text='Pain level 0-5'
    )
    mood = models.CharField(
        max_length=15, choices=MOOD_CHOICES, default='calm'
    )
    flow_intensity = models.CharField(
        max_length=10, choices=FLOW_CHOICES, default='none'
    )
    sleep_hours = models.FloatField(
        null=True, blank=True, help_text='Hours of sleep'
    )
    stress_level = models.IntegerField(
        default=0, help_text='Stress level 0-5'
    )
    exercise_minutes = models.IntegerField(
        default=0, help_text='Minutes of exercise'
    )
    water_intake = models.IntegerField(
        default=0, help_text='Glasses of water'
    )
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'tracker'
        ordering = ['-date']
        unique_together = ['user', 'date']
    
    def __str__(self):
        return f"Log {self.date} - {self.user.email}"


class Symptom(models.Model):
    """Individual symptoms linked to daily logs."""
    
    CATEGORY_CHOICES = [
        ('cramps', 'Cramps'),
        ('headache', 'Headache'),
        ('bloating', 'Bloating'),
        ('fatigue', 'Fatigue'),
        ('nausea', 'Nausea'),
        ('breast_tenderness', 'Breast Tenderness'),
        ('back_pain', 'Back Pain'),
        ('acne', 'Acne'),
        ('cravings', 'Cravings'),
        ('insomnia', 'Insomnia'),
        ('dizziness', 'Dizziness'),
        ('mood_swings', 'Mood Swings'),
        ('other', 'Other'),
    ]
    
    daily_log = models.ForeignKey(
        DailyLog, on_delete=models.CASCADE, related_name='symptoms'
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    severity = models.IntegerField(
        default=1, help_text='Severity 1-5'
    )
    notes = models.CharField(max_length=200, blank=True, default='')
    
    class Meta:
        app_label = 'tracker'
    
    def __str__(self):
        return f"{self.category} ({self.severity})"
