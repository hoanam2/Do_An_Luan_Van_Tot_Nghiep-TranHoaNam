import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smartstay_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const saveSession = useCallback((token, userData) => {
    if (token) localStorage.setItem('smartstay_token', token);
    if (userData) {
      localStorage.setItem('smartstay_user', JSON.stringify(userData));
      setUser(userData);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('smartstay_token');
    localStorage.removeItem('smartstay_user');
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('smartstay_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiClient.get('/auth/me');
      if (res.data?.data?.user) {
        saveSession(token, res.data.data.user);
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [saveSession, logout]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <AuthContext.Provider value={{ user, loading, saveSession, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
