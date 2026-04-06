from rest_framework import serializers
from .models import CycleLog, DailyLog, Symptom


class SymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Symptom
        fields = ['id', 'category', 'severity', 'notes']


class DailyLogSerializer(serializers.ModelSerializer):
    symptoms = SymptomSerializer(many=True, required=False)
    
    class Meta:
        model = DailyLog
        fields = [
            'id', 'date', 'period_status', 'pain_level', 'mood',
            'flow_intensity', 'sleep_hours', 'stress_level',
            'exercise_minutes', 'water_intake', 'notes', 'symptoms',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def create(self, validated_data):
        symptoms_data = validated_data.pop('symptoms', [])
        daily_log = DailyLog.objects.create(**validated_data)
        for symptom_data in symptoms_data:
            Symptom.objects.create(daily_log=daily_log, **symptom_data)
        return daily_log
    
    def update(self, instance, validated_data):
        symptoms_data = validated_data.pop('symptoms', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if symptoms_data is not None:
            instance.symptoms.all().delete()
            for symptom_data in symptoms_data:
                Symptom.objects.create(daily_log=instance, **symptom_data)
        
        return instance


class CycleLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CycleLog
        fields = [
            'id', 'start_date', 'end_date', 'cycle_length',
            'period_length', 'is_predicted', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
