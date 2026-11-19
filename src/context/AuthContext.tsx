import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<User>;
  register: (payload: {
    full_name: string;
    mobile: string;
    email: string;
    password: string;
    confirm_password: string;
    referral_code?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('olearn_user');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // ignore corrupted json
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !localStorage.getItem('olearn_user');
    }
    return true;
  });

  const refreshUser = useCallback(async () => {
    try {
      const data = await api<{ user: User }>('/api/auth/me');
      setUser(data.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('olearn_user', JSON.stringify(data.user));
      }
    } catch {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('olearn_user');
        localStorage.removeItem('olearn_token');
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, password: string, rememberMe = true) => {
    const data = await api<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, rememberMe }),
    });
    if (typeof window !== 'undefined' && data.token) {
      localStorage.setItem('olearn_token', data.token);
      localStorage.setItem('olearn_user', JSON.stringify(data.user));
    }
    setUser(data.user);
    return data.user;
  };

  const register = async (payload: {
    full_name: string;
    mobile: string;
    email: string;
    password: string;
    confirm_password: string;
    referral_code?: string;
  }) => {
    const data = await api<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (typeof window !== 'undefined' && data.token) {
      localStorage.setItem('olearn_token', data.token);
      localStorage.setItem('olearn_user', JSON.stringify(data.user));
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('olearn_user');
        localStorage.removeItem('olearn_token');
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, login, register, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

