import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

const getSafeToken = () => {
  const storedToken = localStorage.getItem('officeflow_token');
  if (!storedToken || storedToken === 'mock_dev_token') {
    localStorage.removeItem('officeflow_token');
    localStorage.removeItem('officeflow_user');
    return null;
  }
  return storedToken;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('officeflow_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => getSafeToken());
  const [loading, setLoading] = useState(false);

  // Sync user state to localStorage
  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUserData };
      localStorage.setItem('officeflow_user', JSON.stringify(merged));
      return merged;
    });
  }, []);

  const login = useCallback(async (email, password, role) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', {
        email: String(email || '').trim(),
        password: String(password || ''),
        role
      });

      const { token: receivedToken, user: receivedUser } = response.data;
      if (!receivedToken || !receivedUser) {
        throw new Error('Invalid login response');
      }

      localStorage.setItem('officeflow_token', receivedToken);
      localStorage.setItem('officeflow_user', JSON.stringify(receivedUser));
      setToken(receivedToken);
      setUser(receivedUser);
      return { success: true };
    } catch (err) {
      const message = err?.message || err?.errors?.[0]?.message || 'Invalid email or password';
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('officeflow_token');
      localStorage.removeItem('officeflow_user');
      setToken(null);
      setUser(null);
    }
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
