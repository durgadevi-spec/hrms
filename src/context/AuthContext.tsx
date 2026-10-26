import { createContext, useContext, useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import type { Employee } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: Employee }>;
  signup: (data: any) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
  isHR: boolean;
  isITSupport: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) {
        setIsLoading(false);
        return;
      }
      const data = await api.get('/api/auth/me');
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();

    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.token);
      setUser(res.employee);
      return { success: true, user: res.employee };
    } catch (error: any) {
      console.error('Login failed:', error);
      return { success: false, error: error?.message || 'Invalid email or password.' };
    }
  }, []);

  const signup = useCallback(async (data: any) => {
    try {
      const res = await api.post('/api/auth/signup', data);
      localStorage.setItem('token', res.token);
      setUser(res.employee);
      return true;
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    isAdmin: user?.role === 'admin' || user?.role === 'hr',
    isManager: user?.role === 'manager' || user?.role === 'admin' || user?.role === 'hr',
    isHR: user?.role === 'hr' || user?.role === 'admin',
    isITSupport: user?.role === 'it_support',
  }), [user, isLoading, login, signup, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}