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
        
        # Update profile
        profile = UserProfile.objects.get(user=user)
        profile.weight = data.get('weight', profile.weight)
        profile.height = data.get('height', profile.height)
        profile.avg_cycle_length = data.get('avg_cycle_length', 28)
        profile.avg_period_length = data.get('avg_period_length', 5)
        profile.activity_level = data.get('activity_level', 'moderate')
        profile.onboarding_complete = True
        profile.save()
        
        # Create historical cycle logs
        from apps.tracker.models import CycleLog
        cycle_dates = data.get('cycle_history', [])
        cycle_dates.sort()
        
        for i, start_date in enumerate(cycle_dates):
            cycle_length = None
            if i + 1 < len(cycle_dates):
                cycle_length = (cycle_dates[i + 1] - start_date).days
            
            CycleLog.objects.create(
                user=user,
                start_date=start_date,
                cycle_length=cycle_length or profile.avg_cycle_length,
                period_length=profile.avg_period_length,
            )
        
        return Response({
            'profile': UserProfileSerializer(profile).data,
            'cycles_created': len(cycle_dates),
            'message': 'Onboarding complete!'
        })
