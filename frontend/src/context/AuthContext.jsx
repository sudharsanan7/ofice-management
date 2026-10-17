import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('officeflow_user');
      return stored ? JSON.parse(stored) : {
        _id: 'default_admin',
        name: 'Sudharsanan (Admin)',
        email: 'admin@officeflow.local',
        role: 'admin',
        designation: 'System Administrator',
        status: 'active'
      };
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('officeflow_token') || 'mock_dev_token');
  const [loading, setLoading] = useState(false);

  // Sync user state to localStorage
  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUserData };
      localStorage.setItem('officeflow_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token: receivedToken, user: receivedUser } = response.data;
      localStorage.setItem('officeflow_token', receivedToken);
      localStorage.setItem('officeflow_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('officeflow_token');
    localStorage.removeItem('officeflow_user');
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAdmin,
        loading,
        login,
        logout,
        updateUser,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
