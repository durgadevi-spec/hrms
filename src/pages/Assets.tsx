import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAssets } from '../context/AssetsContext';
import {
  Plus, Search, Laptop, Smartphone, CreditCard, Key, Package,
  CheckCircle2, Users, X, RotateCcw, UserCheck, Trash2, Edit2, AlertTriangle,
  LayoutGrid, List, SortAsc, SortDesc
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, cn } from '../utils/formatters';
import type { Asset, AssetType } from '../types';

const assetTypeConfig: Record<AssetType, { label: string; icon: React.ElementType; color: string }> = {
  laptop: { label: 'Laptop', icon: Laptop, color: 'bg-primary-100 text-primary-600' },
  mobile: { label: 'Mobile', icon: Smartphone, color: 'bg-accent-100 text-accent-600' },
  id_card: { label: 'ID Card', icon: CreditCard, color: 'bg-warning-100 text-warning-600' },
  access_card: { label: 'Access Card', icon: Key, color: 'bg-error-100 text-error-600' },
  other: { label: 'Other', icon: Package, color: 'bg-secondary-100 text-secondary-600' },
};

const assetStatusConfig: any = {
  available: { color: 'badge-success', label: 'Available' },
  Available: { color: 'badge-success', label: 'Available' },
  assigned: { color: 'badge-info', label: 'Assigned' },
  Assigned: { color: 'badge-info', label: 'Assigned' },
  damaged: { color: 'badge-error', label: 'Damaged' },
  Damaged: { color: 'badge-error', label: 'Damaged' },
  returned: { color: 'badge-neutral', label: 'Returned' },
  Returned: { color: 'badge-neutral', label: 'Returned' },
};
const getStatusConf = (s: string) => assetStatusConfig[s] || assetStatusConfig[String(s || '').toLowerCase()] || { color: 'badge-neutral', label: s || 'Unknown' };


// ─── Add Asset Modal ────────────────────────────────────────────────────────
function AddAssetModal({ asset, onClose }: { asset?: Asset; onClose: () => void }) {
  const { addAsset, updateAsset } = useAssets();
  const [formData, setFormData] = useState({
    name: asset?.name || '',
    assetType: (asset as any)?.assetType || 'laptop',
    serialNumber: asset?.serialNumber || '',
    status: asset?.status || 'Available',
    purchaseDate: (asset as any)?.purchaseDate || (asset as any)?.purchase_date || '',
    location: (asset as any)?.location || '',
    description: asset?.description || ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const normalized = { ...formData, status: (formData.status || 'available').charAt(0).toUpperCase() + (formData.status || 'available').slice(1).toLowerCase() };
      if (asset) {
        await updateAsset(asset.id, normalized as any);
      } else {
        await addAsset(normalized as any);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex-shrink-0">
          <h2 className="text-lg font-bold text-secondary-900 dark:text-white">
            {asset ? 'Edit Asset' : 'Add New Asset'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-4 overflow-y-auto">
            {error && <p className="text-sm text-error-600 bg-error-50 p-3 rounded-lg">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Asset Name *</label>
                <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="MacBook Pro M2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Type</label>
                <select value={formData.assetType} onChange={e => setFormData({ ...formData, assetType: e.target.value })} className="input-field">
                  <option value="laptop">Laptop</option>
                  <option value="mobile">Mobile</option>
                  <option value="id_card">ID Card</option>
                  <option value="access_card">Access Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Status</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="input-field">
                  <option value="available">Available</option>
                  <option value="assigned">Assigned</option>
                  <option value="damaged">Damaged</option>
                  <option value="returned">Returned</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Serial Number</label>
                <input value={formData.serialNumber} onChange={e => setFormData({ ...formData, serialNumber: e.target.value })} className="input-field" placeholder="e.g. C02XABCDXYZ" />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Purchase Date</label>
                <input type="date" value={formData.purchaseDate} onChange={e => setFormData({ ...formData, purchaseDate: e.target.value })} className="input-field" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Location</label>
                <input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="input-field" placeholder="e.g. Head Office" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-field resize-none h-16" placeholder="Details about the asset..." />
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-800 flex-shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Saving...' : 'Save Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── Assign to Employee Modal ─────────────────────────────────────────────────
function AssignEmployeeModal({ asset, onClose }: { asset: Asset; onClose: () => void }) {
  const { assignAsset } = useAssets();
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/employees').then((d: any) => setEmployees(Array.isArray(d) ? d : [])).catch((e) => console.error('Failed to load employees:', e));
  }, []);

  const activeEmployees = employees.filter(e => String(e.status || '').toLowerCase() === 'active');
  const filtered = search
    ? activeEmployees.filter(e =>
      `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      e.designation.toLowerCase().includes(search.toLowerCase())
    )
    : activeEmployees;

  const handleAssign = async () => {
    if (!selectedEmpId) { setError('Please select an employee.'); return; }
    try {
      await assignAsset(asset.id, selectedEmpId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to assign asset');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-surface-200 dark:border-surface-800">
          <div>
            <h2 className="text-lg font-bold text-secondary-900 dark:text-white">Assign to Employee</h2>
            <p className="text-sm text-secondary-500 mt-0.5 truncate">Assigning: <span className="font-medium text-secondary-700 dark:text-surface-200">{asset.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-surface-200 dark:border-surface-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-secondary-400">No employees found</p>
          ) : (
            filtered.map(emp => {
              const selected = selectedEmpId === emp.id;
              return (
                <button
                  key={emp.id}
                  onClick={() => { setSelectedEmpId(emp.id); setError(''); }}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left mb-1',
                    selected
                      ? 'bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500'
                      : 'hover:bg-surface-50 dark:hover:bg-surface-800'
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-secondary-500 truncate">{emp.designation} · {emp.employeeId}</p>
                  </div>
                  {selected && <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {error && <p className="px-6 text-xs text-error-600">{error}</p>}

        <div className="flex gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleAssign} className="btn-primary flex-1">
            <UserCheck className="w-4 h-4" />
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Return Asset Modal ────────────────────────────────────────────────────────
function ReturnModal({ assetName, assignmentId, onClose }: {
  assetName: string; assignmentId: string; onClose: () => void;
}) {
  const { returnAsset } = useAssets();
  const [condition, setCondition] = useState('good');

  const handleReturn = () => {
    returnAsset(assignmentId, condition);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center mx-auto mb-4">
          <RotateCcw className="w-7 h-7 text-warning-600" />
        </div>
        <h2 className="text-lg font-bold text-secondary-900 dark:text-white mb-1">Return Asset</h2>
        <p className="text-sm text-secondary-500 mb-4">{assetName}</p>
        <div className="text-left mb-5">
          <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Asset Condition</label>
          <select value={condition} onChange={e => setCondition(e.target.value)} className="input-field">
            <option value="good">Good — no issues</option>
            <option value="minor_damage">Minor damage</option>
            <option value="major_damage">Major damage</option>
            <option value="lost">Lost / Missing</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleReturn} className="btn-primary flex-1">
            <RotateCcw className="w-4 h-4" /> Confirm
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Delete Asset Modal ─────────────────────────────────────────────────────
function DeleteAssetModal({ asset, onClose, onConfirm }: { asset: Asset; onClose: () => void; onConfirm: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    try {
      await onConfirm();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete asset');
      setIsDeleting(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in p-6 text-center">
        <div className="w-14 h-14 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-7 h-7 text-error-600" />
        </div>
        <h2 className="text-lg font-bold text-secondary-900 dark:text-white mb-1">Delete Asset</h2>
        <p className="text-sm text-secondary-500 mb-1">Are you sure you want to delete</p>
        <p className="text-sm font-semibold text-secondary-800 dark:text-white mb-4">{asset.name}?</p>
        <div className="flex items-start gap-2 p-3 bg-error-50 dark:bg-error-900/20 border border-error-100 dark:border-error-800 rounded-xl mb-4 text-left">
          <AlertTriangle className="w-4 h-4 text-error-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-error-700 dark:text-error-300">This action cannot be undone. The asset record will be permanently removed.</p>
        </div>
        {error && <p className="text-xs text-error-600 bg-error-50 p-2 rounded mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} disabled={isDeleting} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleDelete} disabled={isDeleting} className="flex-1 px-4 py-2.5 rounded-xl bg-error-600 hover:bg-error-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" /> {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Assets Page ──────────────────────────────────────────────────────────────
export default function Assets() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { assets, assignments } = useAssets();
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    api.get('/api/employees').then((d: any) => setEmployees(Array.isArray(d) ? d : [])).catch(console.error);
  }, []);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortField, setSortField] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };
  // selectedTimesheet state kept for future detail modal
  const [returnTarget, setReturnTarget] = useState<{ assignmentId: string; assetName: string } | null>(null);
  const [assignTarget, setAssignTarget] = useState<Asset | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const { deleteAsset } = useAssets();

  const getAssignment = (assetId: string) =>
    assignments.find((aa: any) => aa.assetId === assetId && !aa.returnedDate);

  const userVisibleAssets = useMemo(() => {
    let filtered = isAdmin
      ? assets
      : assets.filter(a => {
        const assignment = assignments.find((aa: any) => aa.assetId === a.id && !aa.returnedDate);
        return assignment?.employeeId === user?.id;
      });

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(term) ||
        (a.serialNumber?.toLowerCase().includes(term) ?? false)
      );
    }
    if (typeFilter !== 'all') filtered = filtered.filter(a => (a as any).assetType === typeFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(a => String(a.status || '').toLowerCase() === statusFilter);
    if (employeeFilter !== 'all') {
      filtered = filtered.filter(a => {
        const assignment = assignments.find((aa: any) => aa.assetId === a.id && !aa.returnedDate);
        return assignment?.employeeId === employeeFilter;
      });
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (sortField === 'purchaseDate' || sortField === 'purchase_date') {
        aVal = a.purchaseDate || a.purchase_date || '';
        bVal = b.purchaseDate || b.purchase_date || '';
      }
      if (sortField === 'assignment') {
        const aAssignment = assignments.find((aa: any) => aa.assetId === a.id && !aa.returnedDate);
        const bAssignment = assignments.find((aa: any) => aa.assetId === b.id && !aa.returnedDate);
        aVal = aAssignment?.employeeId ? employees.find(e => e.id === aAssignment.employeeId)?.firstName || '' : '';
        bVal = bAssignment?.employeeId ? employees.find(e => e.id === bAssignment.employeeId)?.firstName || '' : '';
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [assets, assignments, isAdmin, user, search, typeFilter, statusFilter, employeeFilter, sortField, sortDir, employees]);

  const stats = useMemo(() => ({
    total: assets.length,
    available: assets.filter(a => String(a.status || '').toLowerCase() === 'available').length,
    assigned: assets.filter(a => String(a.status || '').toLowerCase() === 'assigned').length,
    laptops: assets.filter((a: any) => a.assetType === 'laptop').length,
  }), [assets]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{isAdmin ? 'Asset Management' : 'My Assets'}</h1>
          <p className="text-secondary-600 dark:text-surface-400 mt-1">{isAdmin ? 'Track and manage company assets' : 'Assets assigned to you'}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Asset
          </button>
        )}
      </div>

      {/* Stats (company-wide — admin only) */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Assets', value: stats.total, icon: Package, color: 'primary' },
            { label: 'Available', value: stats.available, icon: CheckCircle2, color: 'success' },
            { label: 'Assigned', value: stats.assigned, icon: Users, color: 'warning' },
            { label: 'Laptops', value: stats.laptops, icon: Laptop, color: 'accent' },
          ].map((s, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
                  s.color === 'primary' ? 'bg-primary-100 text-primary-600' :
                    s.color === 'success' ? 'bg-success-100 text-success-600' :
                      s.color === 'warning' ? 'bg-warning-100 text-warning-600' :
                        'bg-accent-100 text-accent-600'
                )}>
                  <s.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white">{s.value}</p>
                  <p className="text-sm text-secondary-600 dark:text-surface-400">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="text"
              placeholder="Search assets by name or serial number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          {isAdmin && (
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field w-full sm:w-36">
              <option value="all">All Types</option>
              <option value="laptop">Laptop</option>
              <option value="mobile">Mobile</option>
              <option value="id_card">ID Card</option>
              <option value="access_card">Access Card</option>
              <option value="other">Other</option>
            </select>
          )}
          {isAdmin && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-full sm:w-36">
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="assigned">Assigned</option>
              <option value="damaged">Damaged</option>
            </select>
          )}
          {isAdmin && (
            <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="input-field w-full sm:w-48">
              <option value="all">All Employees</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          )}
          <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'list' ? 'bg-white dark:bg-surface-700 shadow-sm' : 'text-secondary-500 hover:text-secondary-700')}
              title="List View"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5 rounded-md transition-colors', viewMode === 'grid' ? 'bg-white dark:bg-surface-700 shadow-sm' : 'text-secondary-500 hover:text-secondary-700')}
              title="Grid View"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:text-secondary-700 dark:hover:text-surface-200">
                      Asset Name
                      {sortField === 'name' && (sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('assetType')} className="flex items-center gap-1 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:text-secondary-700 dark:hover:text-surface-200">
                      Type
                      {sortField === 'assetType' && (sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('status')} className="flex items-center gap-1 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:text-secondary-700 dark:hover:text-surface-200">
                      Status
                      {sortField === 'status' && (sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('assignment')} className="flex items-center gap-1 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:text-secondary-700 dark:hover:text-surface-200">
                      Assignment
                      {sortField === 'assignment' && (sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('purchaseDate')} className="flex items-center gap-1 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:text-secondary-700 dark:hover:text-surface-200">
                      Purchase Date
                      {sortField === 'purchaseDate' && (sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort('location')} className="flex items-center gap-1 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:text-secondary-700 dark:hover:text-surface-200">
                      Location
                      {sortField === 'location' && (sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                    </button>
                  </th>
                  {isAdmin && <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {userVisibleAssets.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-4 py-12 text-center text-secondary-400">No assets found</td>
                  </tr>
                ) : (
                  userVisibleAssets.map(asset => {
                    const typeConfig = assetTypeConfig[asset.assetType as AssetType] || assetTypeConfig.other;
                    const statusConf = getStatusConf(asset.status);
                    const TypeIcon = typeConfig.icon;
                    const assignment = getAssignment(asset.id);
                    const assignedEmployee = assignment ? (employees.find(e => e.id === assignment.employeeId)) : null;

                    return (
                      <tr key={asset.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', typeConfig.color)}>
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-secondary-900 dark:text-white">{asset.name}</p>
                              {asset.serialNumber && <p className="text-xs text-secondary-500">S/N: {asset.serialNumber}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-secondary-700 dark:text-surface-300 capitalize">{asset.assetType.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn('badge', statusConf.color)}>{statusConf.label}</span>
                        </td>
                        <td className="px-4 py-4">
                          {assignedEmployee ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                                {assignedEmployee.firstName.charAt(0)}
                              </div>
                              <div>
                                <button onClick={() => navigate(`/profile/${assignedEmployee.id}`)} className="text-sm font-medium text-secondary-900 dark:text-white hover:text-primary-600 truncate max-w-[120px] text-left block">
                                  {assignedEmployee.firstName} {assignedEmployee.lastName}
                                </button>
                              </div>
                            </div>
                          ) : (
                            asset.status === 'available' && isAdmin ? (
                              <button onClick={() => setAssignTarget(asset as any)} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" /> Assign
                              </button>
                            ) : <span className="text-sm text-secondary-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-secondary-700 dark:text-surface-300">{(asset as any).purchaseDate || (asset as any).purchase_date ? formatDate((asset as any).purchaseDate || (asset as any).purchase_date) : '-'}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-secondary-700 dark:text-surface-300">{(asset as any).location || '-'}</span>
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {assignedEmployee && (
                                <button onClick={() => setReturnTarget({ assignmentId: assignment!.id, assetName: asset.name })} className="p-1.5 text-warning-600 hover:bg-warning-50 rounded-lg transition-colors" title="Return">
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => setEditTarget(asset as any)} className="p-1.5 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteTarget(asset as any)} className="p-1.5 text-secondary-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {userVisibleAssets.length === 0 ? (
            <div className="col-span-full card p-12 text-center">
              <Package className="w-12 h-12 mx-auto text-secondary-300 mb-3" />
              <p className="text-secondary-400">No assets found</p>
            </div>
          ) : (
            userVisibleAssets.map(asset => {
              const typeConfig = assetTypeConfig[asset.assetType as AssetType] || assetTypeConfig.other;
              const statusConf = getStatusConf(asset.status);
              const TypeIcon = typeConfig.icon;
              const assignment = getAssignment(asset.id);
              const assignedEmployee = assignment ? (employees.find((e: any) => e.id === assignment.employeeId) || employees.find((e: any) => e.employeeId === assignment.employeeId)) : null;

              return (
                <div key={asset.id} className="card p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shadow-sm', typeConfig.color)}>
                      <TypeIcon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('badge', statusConf.color)}>{statusConf.label}</span>
                      {isAdmin && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => setEditTarget(asset as any)}
                            className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Edit asset"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(asset as any)}
                            className="p-1.5 rounded-lg text-secondary-400 hover:text-error-600 hover:bg-error-50 transition-colors"
                            title="Delete asset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-secondary-900 dark:text-white">{asset.name}</h3>
                    {asset.serialNumber && (
                      <p className="text-xs text-secondary-500 mt-0.5">S/N: {asset.serialNumber}</p>
                    )}
                    {asset.description && (
                      <p className="text-sm text-secondary-600 dark:text-surface-400 mt-1 line-clamp-2">{asset.description}</p>
                    )}
                  </div>

                  {/* Assigned-to section */}
                  {assignedEmployee ? (
                    <div className="pt-3 border-t border-surface-100 dark:border-surface-800">
                      <p className="text-xs text-secondary-400 uppercase tracking-wider mb-2">Assigned To</p>
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                          onClick={() => navigate(`/profile/${assignedEmployee.id}`)}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {assignedEmployee.firstName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{assignedEmployee.firstName} {assignedEmployee.lastName}</p>
                            <p className="text-xs text-secondary-500">Since {formatDate(assignment!.assignedDate)}</p>
                          </div>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setReturnTarget({ assignmentId: assignment!.id, assetName: asset.name })}
                            className="flex items-center gap-1 text-xs text-warning-600 hover:text-warning-700 font-medium px-2 py-1 rounded-lg hover:bg-warning-50 transition-colors flex-shrink-0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Return
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    asset.status === 'available' && isAdmin && (
                      <div className="pt-3 border-t border-surface-100 dark:border-surface-800">
                        <button
                          onClick={() => setAssignTarget(asset as any)}
                          className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-primary-600 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                        >
                          <Users className="w-4 h-4" />
                          Assign to Employee
                        </button>
                      </div>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {showAddModal && <AddAssetModal onClose={() => setShowAddModal(false)} />}
      {editTarget && <AddAssetModal asset={editTarget} onClose={() => setEditTarget(null)} />}

      {assignTarget && (
        <AssignEmployeeModal
          asset={assignTarget}
          onClose={() => setAssignTarget(null)}
        />
      )}

      {deleteTarget && <DeleteAssetModal asset={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => { await deleteAsset(deleteTarget.id); setDeleteTarget(null); }} />}
      {returnTarget && (
        <ReturnModal
          assetName={returnTarget.assetName}
          assignmentId={returnTarget.assignmentId}
          onClose={() => setReturnTarget(null)}
        />
      )}
    </div>
  );
}