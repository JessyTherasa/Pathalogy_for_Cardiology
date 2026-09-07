/**
 * CardioEvidence — Authentication Context
 * Manages login state, persists session in localStorage, and exposes auth helpers.
 * SYNTHETIC DATA — DEMONSTRATION ONLY.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────
export type AuthRole =
  | 'Cardiologist'
  | 'Pathologist'
  | 'Imaging Specialist'
  | 'Molecular Specialist'
  | 'Reviewer'
  | 'Administrator';

export interface AuthUser {
  email: string;
  name: string;
  title: string;
  department: string;
  role: AuthRole;
  initials: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

// ─── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_TOKEN = 'cardio_auth_token';
const STORAGE_KEY_USER  = 'cardio_auth_user';

// ─── Provider ───────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken]               = useState<string | null>(null);
  const [user, setUser]                 = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading]       = useState(true);   // true while rehydrating from storage

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
    const storedUser  = localStorage.getItem(STORAGE_KEY_USER);
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        setToken(storedToken);
        setUser(parsedUser);
      } catch {
        // Corrupted storage — clear it
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_USER);
      }
    }
    setIsLoading(false);
  }, []);

  // ── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || 'Invalid email or password.');
    }

    const data = await response.json();
    const authUser: AuthUser = data.user;
    const authToken: string  = data.token;

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY_TOKEN, authToken);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authUser));

    setToken(authToken);
    setUser(authUser);
  }, []);

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    // Fire-and-forget server-side invalidation
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    // Clear local state immediately
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_USER);
    // Also clear old role key so RoleContext doesn't resurrect stale role
    localStorage.removeItem('cardio_role');
    setToken(null);
    setUser(null);
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token && !!user,
        user,
        token,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
