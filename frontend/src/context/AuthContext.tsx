'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../lib/api';

export interface User {
  id: string;
  mobileNumber: string;
  role: 'buyer' | 'seller' | 'merchant' | 'moderator' | 'admin' | 'legal_officer';
  isNidVerified: boolean;
  accountStatus: string;
  profile?: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    division?: string;
    district?: string;
    thana?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isLoginModalOpen: boolean;
  deviceFingerprint: string;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  login: (token: string, user: any) => void;
  updateUser: (updatedData: Partial<User>) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize user immediately from persistent localStorage so user is NEVER logged out on refresh
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');

  // 1. Generate or load deterministic client device fingerprint
  useEffect(() => {
    let fp = localStorage.getItem('device_fp');
    if (!fp || fp.length < 16) {
      const rawString = `${navigator.userAgent}_${screen.width}x${screen.height}_${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(rawString);
        window.crypto.subtle.digest('SHA-256', data).then((buf) => {
          const hashHex = Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
          localStorage.setItem('device_fp', hashHex);
          setDeviceFingerprint(hashHex);
        });
      } else {
        const fallback = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
        localStorage.setItem('device_fp', fallback);
        setDeviceFingerprint(fallback);
      }
    } else {
      setDeviceFingerprint(fp);
    }
  }, []);

  // 2. Load stored session and sync with backend on mount
  const refreshProfile = async () => {
    if (typeof window === 'undefined') return;

    const savedUserStr = localStorage.getItem('auth_user');
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        setUser(parsed);
      } catch (e) {
        console.error('Failed to parse cached user:', e);
      }
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiClient<any>('/api/v1/users/me');
      if (res?.data) {
        const normalizedUser: User = {
          id: res.data.userId || res.data.id || user?.id || 'client',
          mobileNumber: res.data.mobileNumber || user?.mobileNumber || '',
          role: res.data.role || user?.role || 'buyer',
          isNidVerified: Boolean(res.data.isNidVerified),
          accountStatus: res.data.accountStatus || 'ACTIVE',
          profile: res.data.profile || user?.profile,
        };
        localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
        setUser(normalizedUser);
      }
    } catch (err: any) {
      // Only clear if explicitly unauthorized 401
      if (err?.statusCode === 401 || err?.status === 401) {
        console.warn('Session expired (401). Clearing credentials.');
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_user');
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = (token: string, userData: any) => {
    localStorage.setItem('access_token', token);
    const normalizedUser: User = {
      id: userData.userId || userData.id || 'usr_' + Date.now(),
      mobileNumber: userData.mobileNumber || '',
      role: userData.role || 'buyer',
      isNidVerified: Boolean(userData.isNidVerified),
      accountStatus: userData.accountStatus || 'ACTIVE',
      profile: userData.profile,
    };
    localStorage.setItem('auth_user', JSON.stringify(normalizedUser));
    setUser(normalizedUser);
    setIsLoginModalOpen(false);
  };

  const updateUser = (updatedData: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('auth_user', JSON.stringify(merged));
      return merged;
    });
  };

  const logout = async () => {
    try {
      await apiClient('/api/v1/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isLoginModalOpen,
        deviceFingerprint,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        login,
        updateUser,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
