from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model for SYNCHER."""
    email = models.EmailField(unique=True)
    date_of_birth = models.DateField(null=True, blank=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    class Meta:
        app_label = 'accounts'
    
    def __str__(self):
        return self.email


class UserProfile(models.Model):
    """Extended profile data for health tracking."""
    
    ACTIVITY_CHOICES = [
        ('sedentary', 'Sedentary'),
        ('light', 'Lightly Active'),
        ('moderate', 'Moderately Active'),
        ('active', 'Very Active'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    weight = models.FloatField(null=True, blank=True, help_text='Weight in kg')
    height = models.FloatField(null=True, blank=True, help_text='Height in cm')
    avg_cycle_length = models.IntegerField(default=28, help_text='Average cycle length in days')
    avg_period_length = models.IntegerField(default=5, help_text='Average period length in days')
    activity_level = models.CharField(max_length=20, choices=ACTIVITY_CHOICES, default='moderate')
    onboarding_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        app_label = 'accounts'
    
    def __str__(self):
        return f"Profile: {self.user.email}"
