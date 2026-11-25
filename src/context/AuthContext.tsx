import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { User } from '../types';

export interface RegisterPayload {
  full_name: string;
  mobile: string;
  email: string;
  password: string;
  confirm_password: string;
  referral_code?: string;
}

export interface GoogleAuthResponse {
  needsProfileCompletion: boolean;
  user?: User;
  token?: string;
  pendingToken?: string;
  profile?: {
    email: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<User>;
  sendRegisterOtp: (payload: RegisterPayload) => Promise<{ message: string }>;
  verifyRegisterOtp: (email: string, otp: string) => Promise<User>;
  loginWithGoogle: (credential: string) => Promise<GoogleAuthResponse>;
  completeGoogleProfile: (payload: {
    pendingToken: string;
    full_name: string;
    mobile: string;
    password?: string;
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

  const persistSession = (nextUser: User, token?: string) => {
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('olearn_token', token);
      localStorage.setItem('olearn_user', JSON.stringify(nextUser));
    }
    setUser(nextUser);
  };

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
    persistSession(data.user, data.token);
    return data.user;
  };

  const sendRegisterOtp = async (payload: RegisterPayload) => {
    return api<{ ok: boolean; message: string }>('/api/auth/register/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  };

  const verifyRegisterOtp = async (email: string, otp: string) => {
    const data = await api<{ user: User; token: string }>('/api/auth/register/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
    persistSession(data.user, data.token);
    return data.user;
  };

  const loginWithGoogle = async (credential: string) => {
    const data = await api<GoogleAuthResponse>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    if (!data.needsProfileCompletion && data.user) {
      persistSession(data.user, data.token);
    }
    return data;
  };

  const completeGoogleProfile = async (payload: {
    pendingToken: string;
    full_name: string;
    mobile: string;
    password?: string;
    referral_code?: string;
  }) => {
    const data = await api<{ user: User; token: string }>('/api/auth/google/complete-profile', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    persistSession(data.user, data.token);
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
    <AuthContext.Provider
      value={{
        user,
        loading,
        refreshUser,
        login,
        sendRegisterOtp,
        verifyRegisterOtp,
        loginWithGoogle,
        completeGoogleProfile,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
