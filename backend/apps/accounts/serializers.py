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


class CycleEntrySerializer(serializers.Serializer):
    """A single period entry with start and end dates."""
    start_date = serializers.DateField()
    end_date = serializers.DateField()

    def validate(self, data):
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError('End date must be on or after start date.')
        period_days = (data['end_date'] - data['start_date']).days + 1
        if period_days > 15:
            raise serializers.ValidationError('Period length seems too long (>15 days).')
        return data


class OnboardingSerializer(serializers.Serializer):
    """Accepts onboarding data: profile + historical cycles with start/end dates."""
    weight = serializers.FloatField(required=False, allow_null=True)
    height = serializers.FloatField(required=False, allow_null=True)
    activity_level = serializers.ChoiceField(
        choices=['sedentary', 'light', 'moderate', 'active'],
        default='moderate'
    )
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    # Historical cycle data: list of {start_date, end_date} entries
    cycle_history = serializers.ListField(
        child=CycleEntrySerializer(),
        required=False,
        default=list
    )
