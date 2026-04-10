import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Layout from './components/Layout';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import OnboardingFlow from './features/auth/OnboardingFlow';
import Dashboard from './features/dashboard/Dashboard';
import DailyLogger from './features/tracker/DailyLogger';
import AnalyticsPage from './features/insights/AnalyticsPage';
import LifestylePage from './features/lifestyle/LifestylePage';
import ChatWindow from './features/chatbot/ChatWindow';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <div className="logo-icon-lg" style={{
          width: 64, height: 64, fontSize: '1.75rem',
          animation: 'pulse-glow 2s ease-in-out infinite'
        }}>S</div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function OnboardedRoute({ children }) {
  const { isAuthenticated, isOnboarded, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <div className="logo-icon-lg" style={{
          width: 64, height: 64, fontSize: '1.75rem',
          animation: 'pulse-glow 2s ease-in-out infinite'
        }}>S</div>
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isOnboarded) return <Navigate to="/onboarding" />;
  return children;
}

function AppRoutes() {
  const { isAuthenticated, isOnboarded } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? (isOnboarded ? <Navigate to="/dashboard" /> : <Navigate to="/onboarding" />) : <LoginPage />
      } />
      <Route path="/register" element={
        isAuthenticated ? (isOnboarded ? <Navigate to="/dashboard" /> : <Navigate to="/onboarding" />) : <RegisterPage />
      } />
      <Route path="/onboarding" element={
        <ProtectedRoute><OnboardingFlow /></ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <OnboardedRoute>
          <Layout><Dashboard /></Layout>
        </OnboardedRoute>
      } />
      <Route path="/log" element={
        <OnboardedRoute>
          <Layout><DailyLogger /></Layout>
        </OnboardedRoute>
      } />
      <Route path="/analytics" element={
        <OnboardedRoute>
          <Layout><AnalyticsPage /></Layout>
        </OnboardedRoute>
      } />
      <Route path="/lifestyle" element={
        <OnboardedRoute>
          <Layout><LifestylePage /></Layout>
        </OnboardedRoute>
      } />
      <Route path="/chat" element={
        <OnboardedRoute>
          <Layout><ChatWindow /></Layout>
        </OnboardedRoute>
      } />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (

      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>

  );
}
