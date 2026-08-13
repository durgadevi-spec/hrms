import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';
import type { Asset, AssetTypeOption, AssetCategoryOption } from '../types';

export type { Asset, AssetTypeOption, AssetCategoryOption };

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
  assetTypes: AssetTypeOption[];
  assetCategories: AssetCategoryOption[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Asset CRUD
  addAsset: (asset: Partial<Asset> & { assignedEmployeeId?: string; assignedDate?: string }) => Promise<void>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;

  // Dynamic type/category management — lets Admin/IT Support add new options
  // straight from the Assets page instead of editing backend code.
  addAssetType: (name: string) => Promise<AssetTypeOption>;
  updateAssetType: (id: string, name: string) => Promise<AssetTypeOption>;
  deleteAssetType: (id: string) => Promise<void>;
  addAssetCategory: (name: string, hardwareProfile: 'computer' | 'mobile' | 'none') => Promise<AssetCategoryOption>;
  updateAssetCategory: (id: string, name: string, hardwareProfile: 'computer' | 'mobile' | 'none') => Promise<AssetCategoryOption>;
  deleteAssetCategory: (id: string) => Promise<void>;

  // Assignment actions
  assignAsset: (assetId: string, employeeId: string) => Promise<void>;
  returnAsset: (assignmentId: string, condition?: string) => Promise<void>;

  // Derived helpers
  getEmployeeAssets: (employeeId: string) => { asset: Asset; assignment: AssetAssignment }[];
  getAvailableAssets: () => Asset[];
}

const AssetsContext = createContext<AssetsContextType | undefined>(undefined);

export function AssetsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assignments, setAssignments] = useState<AssetAssignment[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetTypeOption[]>([]);
  const [assetCategories, setAssetCategories] = useState<AssetCategoryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!localStorage.getItem('token')) {
      setAssets([]);
      setAssignments([]);
      setAssetTypes([]);
      setAssetCategories([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [assetsData, assignmentsData, typesData, categoriesData] = await Promise.all([
        api.get('/api/assets'),
        api.get('/api/assets/assignments/all'),
        api.get('/api/asset-types').catch(() => []),
        api.get('/api/asset-categories').catch(() => []),
      ]);

      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      setAssetTypes(Array.isArray(typesData) ? typesData : []);
      setAssetCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setError('Failed to load assets.');
      setAssets([]);
      setAssignments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch whenever auth state flips (e.g. login/logout without a full page reload),
  // not just once when the provider first mounts.
  useEffect(() => {
    fetchAll();
  }, [fetchAll, isAuthenticated]);

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

  // ── Dynamic type/category management ─────────────────────────────────────────

  const addAssetType = async (name: string) => {
    const created = await api.post('/api/asset-types', { name });
    setAssetTypes(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created as AssetTypeOption;
  };

  const updateAssetType = async (id: string, name: string) => {
    const updated = await api.put(`/api/asset-types/${id}`, { name });
    setAssetTypes(prev => prev.map(item => item.id === id ? { ...item, name: updated.name } : item).sort((a, b) => a.name.localeCompare(b.name)));
    return updated as AssetTypeOption;
  };

  const deleteAssetType = async (id: string) => {
    await api.delete(`/api/asset-types/${id}`);
    setAssetTypes(prev => prev.filter(item => item.id !== id));
  };

  const addAssetCategory = async (name: string, hardwareProfile: 'computer' | 'mobile' | 'none') => {
    const created = await api.post('/api/asset-categories', { name, hardwareProfile });
    setAssetCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    return created as AssetCategoryOption;
  };

  const updateAssetCategory = async (id: string, name: string, hardwareProfile: 'computer' | 'mobile' | 'none') => {
    const updated = await api.put(`/api/asset-categories/${id}`, { name, hardwareProfile });
    setAssetCategories(prev => prev.map(item => item.id === id ? { ...item, name: updated.name, hardwareProfile: updated.hardwareProfile } : item).sort((a, b) => a.name.localeCompare(b.name)));
    return updated as AssetCategoryOption;
  };

  const deleteAssetCategory = async (id: string) => {
    await api.delete(`/api/asset-categories/${id}`);
    setAssetCategories(prev => prev.filter(item => item.id !== id));
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
          asset: assets.find((a) => a.id === assignment.assetId) || ({
            id: assignment.assetId,
            name: assignment.assetName,
            assetType: 'other',
            category: null,
            assetCode: null,
            serialNumber: null,
            brand: null,
            model: null,
            processor: null,
            ram: null,
            storageType: null,
            storageCapacity: null,
            operatingSystem: null,
            graphicsCard: null,
            displaySize: null,
            purchaseDate: null,
            purchaseCost: null,
            vendor: null,
            invoiceNumber: null,
            warrantyStartDate: null,
            warrantyEndDate: null,
            location: null,
            department: null,
            description: null,
            status: 'assigned',
            assetImage: null,
            documents: [],
            createdAt: '',
          } as Asset),
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
        assetTypes,
        assetCategories,
        isLoading,
        error,
        refresh: fetchAll,
        addAsset,
        updateAsset,
        deleteAsset,
        addAssetType,
        updateAssetType,
        deleteAssetType,
        addAssetCategory,
        updateAssetCategory,
        deleteAssetCategory,
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