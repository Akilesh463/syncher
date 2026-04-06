from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .ml_engine import predict_next_cycle, train_user_model, extract_symptom_features


class PredictView(APIView):
    """Get predictions for the current user."""
    
    def get(self, request):
        prediction = predict_next_cycle(request.user)
        
        if prediction is None:
            return Response(
                {'message': 'Not enough cycle data for predictions. Log at least 2 cycles.'},
                status=status.HTTP_200_OK
            )
        
        return Response(prediction)


class TrainModelView(APIView):
    """Trigger model training for the current user."""
    
    def post(self, request):
        success = train_user_model(request.user)
        
        if success:
            return Response({'message': 'Model trained successfully!'})
        
        return Response(
            {'message': 'Not enough data to train. Need at least 3 cycles.'},
            status=status.HTTP_200_OK
        )


class SymptomAnalyticsView(APIView):
    """Get symptom analytics for the user."""
    
    def get(self, request):
        features = extract_symptom_features(request.user)
        return Response(features)
