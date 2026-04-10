from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from .serializers import (
    UserRegistrationSerializer, UserSerializer,
    UserProfileSerializer, OnboardingSerializer
)
from .models import UserProfile

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """Register a new user."""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """Login with email/password → JWT tokens."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email and password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.check_password(password):
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        refresh = RefreshToken.for_user(user)
        profile = UserProfile.objects.get(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'profile': UserProfileSerializer(profile).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class ProfileView(generics.RetrieveUpdateAPIView):
    """Get or update user profile."""
    serializer_class = UserProfileSerializer
    
    def get_object(self):
        return UserProfile.objects.get(user=self.request.user)


class OnboardingView(APIView):
    """Complete onboarding with profile data + cycle history."""
    
    def post(self, request):
        serializer = OnboardingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        
        # Update user
        user = request.user
        if data.get('date_of_birth'):
            user.date_of_birth = data['date_of_birth']
            user.save()
        
        # Process cycle history entries (each has start_date + end_date)
        from apps.tracker.models import CycleLog
        cycle_entries = data.get('cycle_history', [])
        # Sort by start_date
        cycle_entries.sort(key=lambda e: e['start_date'])
        
        # Compute period lengths and cycle lengths from actual dates
        period_lengths = []
        cycle_lengths = []
        
        for i, entry in enumerate(cycle_entries):
            # Period length = end_date - start_date + 1 (inclusive)
            period_len = (entry['end_date'] - entry['start_date']).days + 1
            period_lengths.append(period_len)
            
            # Cycle length = gap between this start and next start
            cycle_len = None
            if i + 1 < len(cycle_entries):
                cycle_len = (cycle_entries[i + 1]['start_date'] - entry['start_date']).days
                cycle_lengths.append(cycle_len)
            
            CycleLog.objects.create(
                user=user,
                start_date=entry['start_date'],
                cycle_length=cycle_len,  # None for last entry (will be computed later)
                period_length=period_len,
            )
        
        # Compute averages from actual data
        avg_cycle = round(sum(cycle_lengths) / len(cycle_lengths)) if cycle_lengths else 28
        avg_period = round(sum(period_lengths) / len(period_lengths)) if period_lengths else 5
        
        # Update last cycle's cycle_length with the computed average (since no next date exists)
        last_cycle = CycleLog.objects.filter(
            user=user, cycle_length__isnull=True
        ).order_by('-start_date').first()
        if last_cycle:
            last_cycle.cycle_length = avg_cycle
            last_cycle.save()
        
        # Update profile with computed values
        profile = UserProfile.objects.get(user=user)
        profile.weight = data.get('weight', profile.weight)
        profile.height = data.get('height', profile.height)
        profile.avg_cycle_length = avg_cycle
        profile.avg_period_length = avg_period
        profile.activity_level = data.get('activity_level', 'moderate')
        profile.onboarding_complete = True
        profile.save()
        
        return Response({
            'profile': UserProfileSerializer(profile).data,
            'cycles_created': len(cycle_entries),
            'avg_cycle_length': avg_cycle,
            'avg_period_length': avg_period,
            'message': 'Onboarding complete!'
        })
