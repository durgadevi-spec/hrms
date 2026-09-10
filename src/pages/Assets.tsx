import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAssets } from '../context/AssetsContext';
import {
  Plus, Search, Package, Upload,
  UploadCloud, File as FileIcon, FileText, DollarSign, Building2, ShieldCheck,
  CheckCircle2, Users, X, RotateCcw, UserCheck, Trash2, Edit2, AlertTriangle,
  LayoutGrid, List, SortAsc, SortDesc, Copy, Cpu, Image as ImageIcon
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, cn } from '../utils/formatters';
import { getIconComponent } from '../utils/iconMap';
import type { Asset, AssetDocument } from '../types';

// Get type styling from database-backed asset types
// Falls back to Package icon and secondary color if type not found
const getTypeStyle = (typeName: string, assetTypes: any[]) => {
  const type = assetTypes.find(t => t.name === typeName);
  if (type) {
    return {
      icon: getIconComponent(type.icon),
      color: type.color || 'bg-secondary-100 text-secondary-600'
    };
  }
  return {
    icon: Package,
    color: 'bg-secondary-100 text-secondary-600'
  };
};

const assetStatusConfig: Record<string, { color: string; label: string }> = {
  available: { color: 'badge-success', label: 'Available' },
  assigned: { color: 'badge-info', label: 'Assigned' },
  maintenance: { color: 'badge-warning', label: 'Maintenance' },
  damaged: { color: 'badge-error', label: 'Damaged' },
  lost: { color: 'badge-error', label: 'Lost' },
  retired: { color: 'badge-neutral', label: 'Retired' },
  disposed: { color: 'badge-neutral', label: 'Disposed' },
  returned: { color: 'badge-neutral', label: 'Returned' },
};
const getStatusConf = (s: string) => assetStatusConfig[String(s || '').toLowerCase()] || { color: 'badge-neutral', label: s || 'Unknown' };

const ASSET_STATUS_OPTIONS = ['Available', 'Assigned', 'Maintenance', 'Damaged', 'Lost', 'Retired', 'Disposed'];

// Reads a File into a base64 data URL — same approach used for employee photos
// and attachments elsewhere in this app, so it works with the existing
// TEXT/JSONB columns without needing separate file storage.
const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });


// ─── Add Asset Modal ────────────────────────────────────────────────────────
// `asset` = editing this exact record in place.
// `cloneFrom` = pre-fill from this record but save as a brand-new asset
// (serial number and status are left blank/default since those are specific
// to one physical item, everything else — name, type, location, etc. — carries over).

function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1 first:pt-0">
      <Icon className="w-4 h-4 text-primary-500" />
      <h3 className="text-xs font-bold uppercase tracking-wider text-secondary-500 dark:text-surface-400">{title}</h3>
    </div>
  );
}

// Small inline "add new" control used for both Type and Category selects, so
// Admin/IT Support can grow either list without leaving the Add Asset form.
function AddAssetTypeModal({ onClose }: { onClose: () => void }) {
  const { addAssetType, updateAssetType, deleteAssetType, assetTypes } = useAssets();
  const [value, setValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setValue('');
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async () => {
    if (!value.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateAssetType(editingId, value.trim());
      } else {
        await addAssetType(value.trim());
      }
      resetForm();
    } catch (e: any) {
      setError(e.message || 'Failed to save asset type');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (type: { id: string; name: string }) => {
    setEditingId(type.id);
    setValue(type.name);
    setError('');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAssetType(id);
      if (editingId === id) resetForm();
    } catch (e: any) {
      setError(e.message || 'Failed to delete asset type');
    }
  };

  // Filter types based on search
  const filteredTypes = assetTypes.filter(type =>
    type.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-secondary-900 dark:text-white">Asset Types</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-6">
          <div className="w-80 space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">{editingId ? 'Edit type' : 'Type name'}</label>
              <input value={value} onChange={e => setValue(e.target.value)} placeholder="e.g. Monitor, Printer, Dock" className="input-field" />
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={resetForm} className="btn-secondary flex-1 text-sm">Clear</button>
              <button type="button" disabled={saving || !value.trim()} onClick={handleSubmit} className="btn-primary flex-1 text-sm disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Save' : 'Add'}
              </button>
            </div>

            {error && <p className="text-xs text-error-600 bg-error-50 p-2 rounded">{error}</p>}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="mb-3">
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Search types</label>
              <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Search by name..." 
                className="input-field" 
              />
            </div>

            <div className="border border-surface-200 dark:border-surface-700 rounded-xl flex-1 min-h-0 overflow-y-auto">
              <div className="p-2 space-y-2">
                {filteredTypes.length === 0 ? (
                  <p className="text-sm text-secondary-400 p-2">{assetTypes.length === 0 ? 'No asset types yet.' : 'No types match your search.'}</p>
                ) : (
                  filteredTypes.map(type => (
                    <div key={type.id} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-surface-50 dark:hover:bg-surface-800">
                      <span className="text-sm font-medium text-secondary-700 dark:text-surface-200">{type.name}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEdit(type)} className="text-xs px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100">Edit</button>
                        <button type="button" onClick={() => handleDelete(type.id)} className="text-xs px-2 py-1 rounded bg-error-50 text-error-700 hover:bg-error-100">Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddAssetCategoryModal({ onClose }: { onClose: () => void }) {
  const { addAssetCategory, updateAssetCategory, deleteAssetCategory, assetCategories } = useAssets();
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<'computer' | 'mobile' | 'none'>('none');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setName('');
    setProfile('none');
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await updateAssetCategory(editingId, name.trim(), profile);
      } else {
        await addAssetCategory(name.trim(), profile);
      }
      resetForm();
    } catch (e: any) {
      setError(e.message || 'Failed to save asset category');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: { id: string; name: string; hardwareProfile: 'computer' | 'mobile' | 'none' }) => {
    setEditingId(category.id);
    setName(category.name);
    setProfile(category.hardwareProfile);
    setError('');
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAssetCategory(id);
      if (editingId === id) resetForm();
    } catch (e: any) {
      setError(e.message || 'Failed to delete asset category');
    }
  };

  // Filter categories based on search
  const filteredCategories = assetCategories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-secondary-900 dark:text-white">Asset Categories</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-6">
          <div className="w-80 space-y-3">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">{editingId ? 'Edit category' : 'Category name'}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Office Equipment, Furniture" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Hardware profile</label>
              <select value={profile} onChange={e => setProfile(e.target.value as 'computer' | 'mobile' | 'none')} className="input-field text-sm">
                <option value="none">No hardware specs</option>
                <option value="computer">Computer / laptop</option>
                <option value="mobile">Mobile / tablet</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={resetForm} className="btn-secondary flex-1 text-sm">Clear</button>
              <button type="button" disabled={saving || !name.trim()} onClick={handleSubmit} className="btn-primary flex-1 text-sm disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Save' : 'Add'}
              </button>
            </div>

            {error && <p className="text-xs text-error-600 bg-error-50 p-2 rounded">{error}</p>}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="mb-3">
              <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Search categories</label>
              <input 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                placeholder="Search by name..." 
                className="input-field" 
              />
            </div>

            <div className="border border-surface-200 dark:border-surface-700 rounded-xl flex-1 min-h-0 overflow-y-auto">
              <div className="p-2 space-y-2">
                {filteredCategories.length === 0 ? (
                  <p className="text-sm text-secondary-400 p-2">{assetCategories.length === 0 ? 'No asset categories yet.' : 'No categories match your search.'}</p>
                ) : (
                  filteredCategories.map(category => (
                    <div key={category.id} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-surface-50 dark:hover:bg-surface-800">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-secondary-700 dark:text-surface-200 truncate">{category.name}</p>
                        <p className="text-[10px] uppercase tracking-wide text-secondary-400">{category.hardwareProfile}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEdit(category)} className="text-xs px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100">Edit</button>
                        <button type="button" onClick={() => handleDelete(category.id)} className="text-xs px-2 py-1 rounded bg-error-50 text-error-700 hover:bg-error-100">Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddAssetModal({ asset, cloneFrom, onClose }: { asset?: Asset; cloneFrom?: Asset; onClose: () => void }) {
  const { addAsset, updateAsset, assetTypes, assetCategories } = useAssets();
  const source = asset || cloneFrom;
  const isClone = !asset && !!cloneFrom;
  const isEdit = !!asset;

  const [formData, setFormData] = useState({
    name: source?.name || '',
    assetType: (source as any)?.assetType || assetTypes[0]?.name || '',
    category: (source as any)?.category || '',
    assetCode: asset ? ((source as any)?.assetCode || '') : '', // don't clone a code — each physical item needs its own
    serialNumber: asset ? (asset?.serialNumber || '') : '', // never carry over a serial number when cloning
    brand: (source as any)?.brand || '',
    model: (source as any)?.model || '',
    processor: (source as any)?.processor || '',
    ram: (source as any)?.ram || '',
    storageType: (source as any)?.storageType || '',
    storageCapacity: (source as any)?.storageCapacity || '',
    operatingSystem: (source as any)?.operatingSystem || '',
    graphicsCard: (source as any)?.graphicsCard || '',
    displaySize: (source as any)?.displaySize || '',
    purchaseDate: (source as any)?.purchaseDate || (source as any)?.purchase_date || '',
    purchaseCost: (source as any)?.purchaseCost != null ? String((source as any).purchaseCost) : '',
    vendor: (source as any)?.vendor || '',
    invoiceNumber: asset ? ((source as any)?.invoiceNumber || '') : '',
    warrantyStartDate: (source as any)?.warrantyStartDate || '',
    warrantyEndDate: (source as any)?.warrantyEndDate || '',
    location: (source as any)?.location || '',
    department: (source as any)?.department || '',
    assignedEmployeeId: '',
    assignedDate: new Date().toISOString().split('T')[0],
    status: isClone ? 'Available' : (source?.status || 'Available'), // a clone is a fresh, unassigned item
    description: source?.description || '',
    assetImage: (source as any)?.assetImage || '',
    documents: isClone ? [] : ((source as any)?.documents || []),
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get('/api/employees').then((d: any) => setEmployees(Array.isArray(d) ? d.filter((e: any) => String(e.status || '').toLowerCase() === 'active') : [])).catch(() => {});
    api.get('/api/departments').then((d: any) => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const selectedCategory = assetCategories.find(c => c.name === formData.category);
  const hardwareProfile = selectedCategory?.hardwareProfile || 'none';

  const set = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set({ assetImage: await readFileAsDataUrl(file) });
  };

  const handleDocsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    const newDocs: AssetDocument[] = await Promise.all(
      files.map(async f => ({ name: f.name, size: f.size, type: f.type, url: await readFileAsDataUrl(f) }))
    );
    set({ documents: [...formData.documents, ...newDocs] });
    if (docsInputRef.current) docsInputRef.current.value = '';
  };

  const removeDoc = (idx: number) => set({ documents: formData.documents.filter((_: any, i: number) => i !== idx) });

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const payload: any = {
        ...formData,
        status: (formData.status || 'available').charAt(0).toUpperCase() + (formData.status || 'available').slice(1).toLowerCase(),
        purchaseCost: formData.purchaseCost === '' ? null : Number(formData.purchaseCost),
      };
      // Hardware fields that don't apply to the selected category are cleared
      // rather than silently saved, so switching category later doesn't leave
      // stale specs behind.
      if (hardwareProfile === 'none') {
        Object.assign(payload, {
          processor: '', ram: '', storageType: '', storageCapacity: '',
          operatingSystem: '', graphicsCard: '', displaySize: '',
        });
      } else if (hardwareProfile === 'mobile') {
        Object.assign(payload, { processor: '', graphicsCard: '', storageType: '' });
      }
      if (!formData.assignedEmployeeId) {
        delete payload.assignedEmployeeId;
        delete payload.assignedDate;
      }
      if (asset) {
        await updateAsset(asset.id, payload);
      } else {
        await addAsset(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = 'input-field';
  const labelCls = 'block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-secondary-900 dark:text-white">
              {asset ? 'Edit Asset' : isClone ? 'Clone Asset' : 'Add New Asset'}
            </h2>
            {isClone && (
              <p className="text-xs text-secondary-500 mt-0.5">
                Pre-filled from <span className="font-medium">{cloneFrom?.name}</span> — update the serial number and anything else that's different, then save.
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="p-6 space-y-3 overflow-y-auto">
            {error && <p className="text-sm text-error-600 bg-error-50 p-3 rounded-lg">{error}</p>}

            {/* ── Basic Info ─────────────────────────────────────────────── */}
            <SectionHeading icon={Package} title="Basic Information" />
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Asset Name *</label>
                <input required value={formData.name} onChange={e => set({ name: e.target.value })} className={inputCls} placeholder="MacBook Pro M2" />
              </div>
              <div>
                <label className={labelCls}>Asset ID / Code</label>
                <input value={formData.assetCode} onChange={e => set({ assetCode: e.target.value })} className={inputCls} placeholder="e.g. AST-0042" />
              </div>
              <div>
                <label className={labelCls}>Serial Number</label>
                <input value={formData.serialNumber} onChange={e => set({ serialNumber: e.target.value })} className={inputCls} placeholder="e.g. C02XABCDXYZ" />
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select value={formData.category} onChange={e => set({ category: e.target.value })} className={inputCls}>
                  <option value="">Select category</option>
                  {assetCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Asset Type</label>
                <select value={formData.assetType} onChange={e => set({ assetType: e.target.value })} className={inputCls}>
                  {assetTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Brand / Manufacturer</label>
                <input value={formData.brand} onChange={e => set({ brand: e.target.value })} className={inputCls} placeholder="e.g. Apple, Dell, Samsung" />
              </div>
              <div>
                <label className={labelCls}>Model</label>
                <input value={formData.model} onChange={e => set({ model: e.target.value })} className={inputCls} placeholder="e.g. MacBook Pro 14&quot; M2" />
              </div>
            </div>

            {/* ── Hardware Specs — dynamic based on Category ────────────────── */}
            {hardwareProfile !== 'none' && (
              <>
                <SectionHeading icon={Cpu} title="Hardware Specifications" />
                <div className="grid grid-cols-2 gap-4">
                  {hardwareProfile === 'computer' && (
                    <div>
                      <label className={labelCls}>Processor</label>
                      <input value={formData.processor} onChange={e => set({ processor: e.target.value })} className={inputCls} placeholder="e.g. Apple M2 Pro" />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>RAM</label>
                    <input value={formData.ram} onChange={e => set({ ram: e.target.value })} className={inputCls} placeholder="e.g. 16 GB" />
                  </div>
                  {hardwareProfile === 'computer' && (
                    <div>
                      <label className={labelCls}>Storage Type</label>
                      <select value={formData.storageType} onChange={e => set({ storageType: e.target.value })} className={inputCls}>
                        <option value="">Select</option>
                        <option value="SSD">SSD</option>
                        <option value="HDD">HDD</option>
                        <option value="SSD + HDD">SSD + HDD</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Storage Capacity</label>
                    <input value={formData.storageCapacity} onChange={e => set({ storageCapacity: e.target.value })} className={inputCls} placeholder="e.g. 512 GB" />
                  </div>
                  <div>
                    <label className={labelCls}>Operating System</label>
                    <input value={formData.operatingSystem} onChange={e => set({ operatingSystem: e.target.value })} className={inputCls} placeholder="e.g. macOS Sonoma, Windows 11" />
                  </div>
                  {hardwareProfile === 'computer' && (
                    <div>
                      <label className={labelCls}>Graphics Card</label>
                      <input value={formData.graphicsCard} onChange={e => set({ graphicsCard: e.target.value })} className={inputCls} placeholder="e.g. Apple M2 Pro 16-core GPU" />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Display Size</label>
                    <input value={formData.displaySize} onChange={e => set({ displaySize: e.target.value })} className={inputCls} placeholder="e.g. 14 inch" />
                  </div>
                </div>
              </>
            )}

            {/* ── Purchase & Vendor ──────────────────────────────────────────── */}
            <SectionHeading icon={DollarSign} title="Purchase & Vendor" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Purchase Date</label>
                <input type="date" value={formData.purchaseDate} onChange={e => set({ purchaseDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Purchase Cost</label>
                <input type="number" step="0.01" min="0" value={formData.purchaseCost} onChange={e => set({ purchaseCost: e.target.value })} className={inputCls} placeholder="e.g. 1499.00" />
              </div>
              <div>
                <label className={labelCls}>Vendor</label>
                <input value={formData.vendor} onChange={e => set({ vendor: e.target.value })} className={inputCls} placeholder="e.g. Amazon Business" />
              </div>
              <div>
                <label className={labelCls}>Invoice Number</label>
                <input value={formData.invoiceNumber} onChange={e => set({ invoiceNumber: e.target.value })} className={inputCls} placeholder="e.g. INV-2026-0042" />
              </div>
            </div>

            {/* ── Warranty ───────────────────────────────────────────────────── */}
            <SectionHeading icon={ShieldCheck} title="Warranty" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Warranty Start Date</label>
                <input type="date" value={formData.warrantyStartDate} onChange={e => set({ warrantyStartDate: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Warranty End Date</label>
                <input type="date" value={formData.warrantyEndDate} onChange={e => set({ warrantyEndDate: e.target.value })} className={inputCls} />
              </div>
            </div>

            {/* ── Assignment & Location ──────────────────────────────────────── */}
            <SectionHeading icon={Building2} title="Assignment & Location" />
            <div className="grid grid-cols-2 gap-4">
              {!isEdit && (
                <>
                  <div>
                    <label className={labelCls}>Assigned Employee</label>
                    <select value={formData.assignedEmployeeId} onChange={e => set({ assignedEmployeeId: e.target.value })} className={inputCls}>
                      <option value="">Not assigned yet</option>
                      {employees.map((emp: any) => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} · {emp.employeeId}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Assigned Date</label>
                    <input type="date" value={formData.assignedDate} onChange={e => set({ assignedDate: e.target.value })} disabled={!formData.assignedEmployeeId} className={cn(inputCls, !formData.assignedEmployeeId && 'opacity-50')} />
                  </div>
                </>
              )}
              <div>
                <label className={labelCls}>Department</label>
                <select value={formData.department} onChange={e => set({ department: e.target.value })} className={inputCls}>
                  <option value="">Select department</option>
                  {departments.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Location</label>
                <input value={formData.location} onChange={e => set({ location: e.target.value })} className={inputCls} placeholder="e.g. Head Office" />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Asset Status</label>
                <select value={formData.status} onChange={e => set({ status: e.target.value })} className={inputCls}>
                  {ASSET_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* ── Description ────────────────────────────────────────────────── */}
            <SectionHeading icon={FileText} title="Description" />
            <textarea value={formData.description} onChange={e => set({ description: e.target.value })} className="input-field resize-none h-16" placeholder="Details about the asset..." />

            {/* ── Image & Documents ──────────────────────────────────────────── */}
            <SectionHeading icon={ImageIcon} title="Asset Image & Documents" />
            <div className="flex items-center gap-4 pb-2">
              <div className="w-16 h-16 rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 overflow-hidden shrink-0 flex items-center justify-center">
                {formData.assetImage ? (
                  <img src={formData.assetImage} alt="Asset" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-surface-400" />
                )}
              </div>
              <div>
                <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImageUpload} />
                <button type="button" onClick={() => imageInputRef.current?.click()} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" /> {formData.assetImage ? 'Replace Image' : 'Upload Image'}
                </button>
                {formData.assetImage && (
                  <button type="button" onClick={() => set({ assetImage: '' })} className="ml-2 text-xs text-error-600 hover:text-error-700">Remove</button>
                )}
              </div>
            </div>

            <div>
              <input type="file" multiple className="hidden" ref={docsInputRef} onChange={handleDocsUpload} />
              <button type="button" onClick={() => docsInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-secondary-600 dark:text-surface-300 border-2 border-dashed border-surface-300 dark:border-surface-700 rounded-xl hover:border-primary-400 hover:text-primary-600 transition-colors">
                <UploadCloud className="w-4 h-4" /> Upload documents (invoice, warranty card, etc.)
              </button>
              {formData.documents.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {formData.documents.map((doc: AssetDocument, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-surface-50 dark:bg-surface-800 rounded-lg text-xs">
                      <FileIcon className="w-4 h-4 text-secondary-400 shrink-0" />
                      <span className="flex-1 truncate text-secondary-700 dark:text-surface-300">{doc.name}</span>
                      <span className="text-secondary-400 shrink-0">{formatSize(doc.size)}</span>
                      <button type="button" onClick={() => removeDoc(idx)} className="text-error-500 hover:text-error-700 shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
  const { user, isAdmin, isITSupport } = useAuth();
  const canManageAssets = isAdmin || isITSupport;
  const { assets, assignments, assetTypes } = useAssets();
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
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Asset | null>(null);
  const [cloneTarget, setCloneTarget] = useState<Asset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const { deleteAsset } = useAssets();

  const getAssignment = (assetId: string) =>
    assignments.find((aa: any) => aa.assetId === assetId && !aa.returnedDate);

  const userVisibleAssets = useMemo(() => {
    let filtered = canManageAssets
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
  }, [assets, assignments, canManageAssets, user, search, typeFilter, statusFilter, employeeFilter, sortField, sortDir, employees]);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">{canManageAssets ? 'Asset Management' : 'My Assets'}</h1>
          <p className="text-secondary-600 dark:text-surface-400 mt-1">{canManageAssets ? 'Track and manage company assets' : 'Assets assigned to you'}</p>
        </div>
        {canManageAssets && (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setShowTypeModal(true)} className="btn-secondary">
              <Plus className="w-4 h-4" />
              Add Type
            </button>
            <button type="button" onClick={() => setShowCategoryModal(true)} className="btn-secondary">
              <Plus className="w-4 h-4" />
              Add Category
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Asset
            </button>
          </div>
        )}
      </div>

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
          {canManageAssets && (
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field w-full sm:w-36">
              <option value="all">All Types</option>
              {assetTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          )}
          {canManageAssets && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-full sm:w-36">
              <option value="all">All Status</option>
              {ASSET_STATUS_OPTIONS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
            </select>
          )}
          {canManageAssets && (
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
                  {canManageAssets && <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {userVisibleAssets.length === 0 ? (
                  <tr>
                    <td colSpan={canManageAssets ? 7 : 6} className="px-4 py-12 text-center text-secondary-400">No assets found</td>
                  </tr>
                ) : (
                  userVisibleAssets.map(asset => {
                    const typeStyle = getTypeStyle(asset.assetType, assetTypes);
                    const statusConf = getStatusConf(asset.status);
                    const TypeIcon = typeStyle.icon;
                    const assignment = getAssignment(asset.id);
                    const assignedEmployee = assignment ? (employees.find(e => e.id === assignment.employeeId)) : null;

                    return (
                      <tr key={asset.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', typeStyle.color)}>
                              <TypeIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-secondary-900 dark:text-white">{asset.name}</p>
                              {asset.serialNumber && <p className="text-xs text-secondary-500">S/N: {asset.serialNumber}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-secondary-700 dark:text-surface-300">{asset.assetType}</span>
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
                            String(asset.status || '').toLowerCase() === 'available' && canManageAssets ? (
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
                        {canManageAssets && (
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
                              <button onClick={() => setCloneTarget(asset as any)} className="p-1.5 text-secondary-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors" title="Clone asset">
                                <Copy className="w-4 h-4" />
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
              const typeStyle = getTypeStyle(asset.assetType, assetTypes);
              const statusConf = getStatusConf(asset.status);
              const TypeIcon = typeStyle.icon;
              const assignment = getAssignment(asset.id);
              const assignedEmployee = assignment ? (employees.find((e: any) => e.id === assignment.employeeId) || employees.find((e: any) => e.employeeId === assignment.employeeId)) : null;

              return (
                <div key={asset.id} className="card p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shadow-sm', typeStyle.color)}>
                      <TypeIcon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn('badge', statusConf.color)}>{statusConf.label}</span>
                      {canManageAssets && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => setEditTarget(asset as any)}
                            className="p-1.5 rounded-lg text-secondary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Edit asset"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setCloneTarget(asset as any)}
                            className="p-1.5 rounded-lg text-secondary-400 hover:text-accent-600 hover:bg-accent-50 transition-colors"
                            title="Clone asset"
                          >
                            <Copy className="w-3.5 h-3.5" />
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
                        {canManageAssets && (
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
                    String(asset.status || '').toLowerCase() === 'available' && canManageAssets && (
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

      {showTypeModal && <AddAssetTypeModal onClose={() => setShowTypeModal(false)} />}
      {showCategoryModal && <AddAssetCategoryModal onClose={() => setShowCategoryModal(false)} />}
      {showAddModal && <AddAssetModal onClose={() => setShowAddModal(false)} />}
      {editTarget && <AddAssetModal asset={editTarget} onClose={() => setEditTarget(null)} />}
      {cloneTarget && <AddAssetModal cloneFrom={cloneTarget} onClose={() => setCloneTarget(null)} />}

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