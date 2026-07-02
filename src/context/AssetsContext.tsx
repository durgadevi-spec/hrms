import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  name: string;
  assetType: string;
  serialNumber: string | null;
  description: string | null;
  status: 'available' | 'assigned' | 'damaged' | 'returned';
  createdAt: string;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  assetName: string;
  employeeId: string;
  assignedDate: string;
  returnedDate: string | null;
  status: string;
  remarks: string | null;
}

interface AssetsContextType {
  assets: Asset[];
  assignments: AssetAssignment[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Asset CRUD
  addAsset: (asset: Partial<Asset>) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  // Assignment actions
  assignAsset: (assetId: string, employeeId: string) => Promise<void>;
  returnAsset: (assignmentId: string, condition?: string) => Promise<void>;

  // Derived helpers
  getEmployeeAssets: (employeeId: string) => { asset: Asset; assignment: AssetAssignment }[];
  getAvailableAssets: () => Asset[];
}

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

export function AssetsProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [assetsData, assignmentsData] = await Promise.all([
        api.get('/api/assets'),
        api.get('/api/assets/assignments/all'),
      ]);

      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError('Failed to load assets.');
      setAssets([]);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const addAsset = async (asset: Partial<Asset>) => {
    await api.post('/api/assets', asset);
    await fetchAll();
  };

  const updateAsset = async (id: string, updates: Partial<Asset>) => {
    await api.put(`/api/assets/${id}`, updates);
    await fetchAll();
  };

  const deleteAsset = async (id: string) => {
    await api.delete(`/api/assets/${id}`);
    await fetchAll();
  };

  // ── Assignment actions ───────────────────────────────────────────────────────

  const assignAsset = async (assetId: string, employeeId: string) => {
    await api.post('/api/assets/assign', { assetId, employeeId });
    await fetchAll();
  };

  const returnAsset = async (assignmentId: string, condition?: string) => {
    await api.put(`/api/assets/return/${assignmentId}`, { returnedCondition: condition || 'good' });
    await fetchAll();
  };

  // ── Derived helpers ──────────────────────────────────────────────────────────

  const getEmployeeAssets = useCallback(
    (employeeId: string) =>
      assignments
        .filter((a) => a.employeeId === employeeId && !a.returnedDate)
        .map((assignment) => ({
          asset: assets.find((a) => a.id === assignment.assetId) || {
            id: assignment.assetId,
            name: assignment.assetName,
            assetType: 'other' as const,
            serialNumber: null,
            description: null,
            status: 'assigned' as const,
            createdAt: '',
          },
          assignment,
        })),
    [assignments, assets]
  );

  const getAvailableAssets = useCallback(
    (): Asset[] => assets.filter((a) => String(a.status || '').toLowerCase() === 'available'),
    [assets]
  );

  return (
    <AssetsContext.Provider
      value={{
        assets,
        assignments,
        isLoading,
        error,
        refresh: fetchAll,
        addAsset,
        updateAsset,
        deleteAsset,
        assignAsset,
        returnAsset,
        getEmployeeAssets,
        getAvailableAssets,
      }}
    >
      {children}
    </AssetsContext.Provider>
  );
}

export function useAssets() {
  const context = useContext(AssetsContext);
  if (context === undefined) {
    throw new Error('useAssets must be used within an AssetsProvider');
  }
  return context;
}
