import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('syncher_user');
    const storedTokens = localStorage.getItem('syncher_tokens');
    
    if (storedUser && storedTokens) {
      setUser(JSON.parse(storedUser));
      // Fetch fresh profile
      authAPI.getProfile()
        .then(res => setProfile(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    localStorage.setItem('syncher_tokens', JSON.stringify(data.tokens));
    localStorage.setItem('syncher_user', JSON.stringify(data.user));
    setUser(data.user);
    setProfile(data.profile);
    return data;
  };

  const register = async (formData) => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem('syncher_tokens', JSON.stringify(data.tokens));
    localStorage.setItem('syncher_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('syncher_tokens');
    localStorage.removeItem('syncher_user');
    setUser(null);
    setProfile(null);
  };

  const updateProfile = (newProfile) => {
    setProfile(newProfile);
  };

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, register, logout, updateProfile,
      isAuthenticated: !!user,
      isOnboarded: profile?.onboarding_complete || false,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
