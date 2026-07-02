import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Department } from '../types';
import { api } from '../lib/api';

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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDepartments = useCallback(async () => {
    try {
      if (!localStorage.getItem('token')) return;
      setIsLoading(true);
      const data = await api.get('/api/departments');
      setDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

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
