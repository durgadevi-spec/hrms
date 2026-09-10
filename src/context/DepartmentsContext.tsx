import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Department } from '../types';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface DepartmentsContextType {
  departments: Department[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  addDepartment: (dept: Omit<Department, 'id'>) => Promise<void>;
  updateDepartment: (id: string, updates: Partial<Department>) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
}

const DepartmentsContext = createContext<DepartmentsContextType | undefined>(undefined);

export function DepartmentsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) { setDepartments([]); setIsLoading(false); return; }
      setIsLoading(true);
      const data = await api.get('/api/departments');
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch whenever auth state flips (e.g. login/logout without a full page reload),
  // not just once when the provider first mounts.
  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments, isAuthenticated]);

  const addDepartment = async (dept: Omit<Department, 'id'>) => {
    await api.post('/api/departments', dept);
    await fetchDepartments();
  };

  const updateDepartment = async (id: string, updates: Partial<Department>) => {
    await api.put(`/api/departments/${id}`, updates);
    await fetchDepartments();
  };

  const deleteDepartment = async (id: string) => {
    await api.delete(`/api/departments/${id}`);
    await fetchDepartments();
  };

  return (
    <DepartmentsContext.Provider value={{
      departments, isLoading, refresh: fetchDepartments,
      addDepartment, updateDepartment, deleteDepartment
    }}>
      {children}
    </DepartmentsContext.Provider>
  );
}

export function useDepartments() {
  const context = useContext(DepartmentsContext);
  if (context === undefined) {
    throw new Error('useDepartments must be used within a DepartmentsProvider');
  }
  return context;
}
