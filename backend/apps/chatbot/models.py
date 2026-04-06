from django.db import models
from django.conf import settings


class ChatHistory(models.Model):
    """Stores chat conversations with AI assistant."""
    
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='chat_messages'
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'chatbot'
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.role}: {self.message[:50]}"
