from rest_framework import serializers
from .models import PredictionResult


class PredictionResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = PredictionResult
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class PredictionResponseSerializer(serializers.Serializer):
    predicted_cycle_length = serializers.IntegerField()
    next_period_date = serializers.CharField()
    days_until_period = serializers.IntegerField()
    ovulation_date = serializers.CharField()
    fertile_window_start = serializers.CharField()
    fertile_window_end = serializers.CharField()
    confidence_score = serializers.FloatField()
    model_version = serializers.CharField()
