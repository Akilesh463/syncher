from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'password_confirm', 'date_of_birth']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'date_of_birth']
        read_only_fields = ['id', 'email']


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'weight', 'height',
            'avg_cycle_length', 'avg_period_length',
            'activity_level', 'onboarding_complete',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class OnboardingSerializer(serializers.Serializer):
    """Accepts onboarding data: profile + historical cycles."""
    weight = serializers.FloatField(required=False, allow_null=True)
    height = serializers.FloatField(required=False, allow_null=True)
    avg_cycle_length = serializers.IntegerField(required=False, default=28)
    avg_period_length = serializers.IntegerField(required=False, default=5)
    activity_level = serializers.ChoiceField(
        choices=['sedentary', 'light', 'moderate', 'active'],
        default='moderate'
    )
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    # Historical cycle data: list of start dates
    cycle_history = serializers.ListField(
        child=serializers.DateField(),
        required=False,
        default=list
    )
