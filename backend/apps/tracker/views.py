from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import date
from .models import CycleLog, DailyLog
from .serializers import CycleLogSerializer, DailyLogSerializer
from .services import get_cycle_stats, get_current_phase, get_next_period_info


class CycleLogViewSet(viewsets.ModelViewSet):
    """CRUD for cycle logs."""
    serializer_class = CycleLogSerializer
    
    def get_queryset(self):
        return CycleLog.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        # Auto-calculate previous cycle's length
        cycles = CycleLog.objects.filter(
            user=self.request.user, is_predicted=False
        ).order_by('-start_date')[:2]
        
        if len(cycles) >= 2:
            newer, older = cycles[0], cycles[1]
            older.cycle_length = (newer.start_date - older.start_date).days
            older.save()


class DailyLogViewSet(viewsets.ModelViewSet):
    """CRUD for daily health logs."""
    serializer_class = DailyLogSerializer
    
    def get_queryset(self):
        qs = DailyLog.objects.filter(user=self.request.user)
        # Filter by date range
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')
        if start:
            qs = qs.filter(date__gte=start)
        if end:
            qs = qs.filter(date__lte=end)
        return qs
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get or create today's log."""
        log, created = DailyLog.objects.get_or_create(
            user=request.user, date=date.today()
        )
        return Response(DailyLogSerializer(log).data)


class DashboardView(permissions.IsAuthenticated):
    """Aggregate dashboard data."""
    pass


from rest_framework.views import APIView


class DashboardAPIView(APIView):
    """Get all dashboard data in one call."""
    
    def get(self, request):
        user = request.user
        stats = get_cycle_stats(user)
        phase = get_current_phase(user)
        prediction = get_next_period_info(user)
        
        # Recent logs
        recent_logs = DailyLog.objects.filter(
            user=user
        ).order_by('-date')[:7]
        
        # Recent cycles
        recent_cycles = CycleLog.objects.filter(
            user=user, is_predicted=False
        ).order_by('-start_date')[:6]
        
        return Response({
            'stats': stats,
            'current_phase': phase,
            'prediction': prediction,
            'recent_logs': DailyLogSerializer(recent_logs, many=True).data,
            'recent_cycles': CycleLogSerializer(recent_cycles, many=True).data,
        })
