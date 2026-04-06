from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import generics

from .models import Insight
from .serializers import InsightSerializer
from .rules_engine import generate_insights
from .recommendation import get_recommendations


class InsightsView(APIView):
    """Get health insights for the current user."""
    
    def get(self, request):
        # Generate fresh insights
        generate_insights(request.user)
        
        # Return all active insights
        insights = Insight.objects.filter(
            user=request.user, is_dismissed=False
        )[:20]
        
        return Response(InsightSerializer(insights, many=True).data)


class DismissInsightView(APIView):
    """Dismiss an insight."""
    
    def post(self, request, pk):
        try:
            insight = Insight.objects.get(pk=pk, user=request.user)
            insight.is_dismissed = True
            insight.save()
            return Response({'status': 'dismissed'})
        except Insight.DoesNotExist:
            return Response({'error': 'Insight not found'}, status=404)


class RecommendationsView(APIView):
    """Get personalized recommendations."""
    
    def get(self, request):
        recs = get_recommendations(request.user)
        return Response(recs)
