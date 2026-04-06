from rest_framework import serializers
from .models import Insight, Recommendation


class InsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insight
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class RecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = '__all__'
        read_only_fields = ['user', 'created_at']
