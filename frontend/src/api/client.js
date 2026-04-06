import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('syncher_tokens') || '{}');
  if (tokens.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const tokens = JSON.parse(localStorage.getItem('syncher_tokens') || '{}');
      if (tokens.refresh) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/token/refresh/`, {
            refresh: tokens.refresh,
          });
          
          const newTokens = { ...tokens, access: data.access };
          if (data.refresh) newTokens.refresh = data.refresh;
          localStorage.setItem('syncher_tokens', JSON.stringify(newTokens));
          
          originalRequest.headers.Authorization = `Bearer ${data.access}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('syncher_tokens');
          localStorage.removeItem('syncher_user');
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  onboarding: (data) => api.post('/auth/onboarding/', data),
};

// Tracker APIs
export const trackerAPI = {
  getDashboard: () => api.get('/tracker/dashboard/'),
  getCycles: () => api.get('/tracker/cycles/'),
  createCycle: (data) => api.post('/tracker/cycles/', data),
  getDailyLogs: (params) => api.get('/tracker/daily/', { params }),
  getToday: () => api.get('/tracker/daily/today/'),
  createDailyLog: (data) => api.post('/tracker/daily/', data),
  updateDailyLog: (id, data) => api.patch(`/tracker/daily/${id}/`, data),
};

// Prediction APIs
export const predictionAPI = {
  getPrediction: () => api.get('/predictions/predict/'),
  trainModel: () => api.post('/predictions/train/'),
  getSymptomAnalytics: () => api.get('/predictions/symptom-analytics/'),
};

// Insights APIs
export const insightsAPI = {
  getInsights: () => api.get('/insights/'),
  dismissInsight: (id) => api.post(`/insights/${id}/dismiss/`),
  getRecommendations: () => api.get('/insights/recommendations/'),
};

// Chat APIs
export const chatAPI = {
  sendMessage: (message) => api.post('/chat/', { message }),
  getHistory: () => api.get('/chat/history/'),
  clearHistory: () => api.delete('/chat/history/'),
};

export default api;
