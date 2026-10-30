import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAssets } from '../context/AssetsContext';
import {
  Mail, Phone, MapPin, Calendar, Building2, Users,
  GraduationCap, Heart, Globe, Droplets, AlertTriangle, UserX,
  Package, CheckCircle2,
  Clock, UserCheck, X, Shield, ArrowLeft, Edit2, Eye, ChevronRight,
  Plus, RotateCcw, Crown, Save, Briefcase, Award, Activity,
  FileText, TrendingUp, Star, User, Trash2
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, cn } from '../utils/formatters';
import { getIconComponent } from '../utils/iconMap';
import type { AssetType } from '../types';
import SuccessAnimationModal from '../components/common/SuccessAnimationModal';
import NoDataAnimation from '../components/common/NoDataAnimation';

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ firstName, lastName, size = 'lg', color }: {
  firstName: string; lastName: string; size?: 'sm' | 'md' | 'lg' | 'xl'; color?: string;
}) {
  const sizeClass = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-28 h-28 text-3xl',
  }[size];

  // Deterministic color based on name
  const colors = [
    'from-blue-500 to-blue-700',
    'from-violet-500 to-violet-700',
    'from-emerald-500 to-emerald-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-cyan-500 to-cyan-700',
    'from-indigo-500 to-indigo-700',
    'from-teal-500 to-teal-700',
  ];
  const idx = (firstName.charCodeAt(0) + (lastName.charCodeAt(0) || 0)) % colors.length;
  const gradient = color || colors[idx];

  return (
    <div className={cn('rounded-xl bg-gradient-to-br text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm select-none', gradient, sizeClass)}>
      {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Get asset type styling from database ─────────────────────────────────────
// Falls back to Package icon and gray color if type not found
const getAssetTypeStyle = (typeName: string, assetTypes: any[]) => {
  const type = assetTypes.find(t => t.name === typeName);
  if (type) {
    return {
      icon: getIconComponent(type.icon),
      color: type.color || 'bg-gray-50 text-gray-500 border border-gray-100'
    };
  }
  return {
    icon: Package,
    color: 'bg-gray-50 text-gray-500 border border-gray-100'
  };
};

import EmployeeProfileForm from '../components/employees/EmployeeProfileForm';
import EmployeeDetailsModal from '../components/employees/EmployeeDetailsModal';

// ─── Assign Asset Modal ───────────────────────────────────────────────────────
function AssignAssetModal({ employeeId, employeeName, onClose, onAssigned }: { employeeId: string; employeeName: string; onClose: () => void; onAssigned?: () => void }) {
  const { assets, assetTypes, assignAsset, refresh } = useAssets();
  // Case-insensitive status check to handle 'available' / 'Available' / 'AVAILABLE' consistently
  const available = assets.filter(a => String(a.status || '').toLowerCase() === 'available');
  // Also include assets with no status or empty status (treat as available for safety)
  const fallback = assets.filter(a => !a.status || String(a.status).trim() === '');
  const allAvailable = [...available, ...fallback.filter(a => !available.find(x => x.id === a.id))];
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Refresh assets when the modal opens
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-secondary-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 bg-primary-600 text-white">
          <div><h2 className="text-sm font-bold">Assign Asset</h2><p className="text-xs text-primary-200 mt-0.5">To {employeeName}</p></div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-2 max-h-72 overflow-y-auto">
          {allAvailable.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="w-8 h-8 mx-auto text-secondary-300 mb-2" />
              <p className="text-sm text-secondary-500">No assets available</p>
              <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] text-secondary-400 underline mt-1">Show debug</button>
              {showDebug && (
                <div className="mt-2 text-left text-[10px] text-secondary-400 max-h-32 overflow-y-auto bg-secondary-50 p-2 rounded">
                  {assets.length === 0 ? <p>No assets loaded</p> : assets.map(a => <p key={a.id}>{a.name}: status="{a.status}" (len={String(a.status || '').length})</p>)}
                </div>
              )}
            </div>
          ) : allAvailable.map(asset => {
            const typeStyle = getAssetTypeStyle(asset.assetType, assetTypes);
            const Icon = typeStyle.icon;
            const sel = selectedId === asset.id;
            return (
              <button key={asset.id} onClick={() => { setSelectedId(asset.id); setError(''); }}
                className={cn('w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left', sel ? 'border-primary-500 bg-primary-50' : 'border-secondary-200 hover:border-secondary-300')}>
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', typeStyle.color)}><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-secondary-900 truncate">{asset.name}</p>
                  {asset.serialNumber && <p className="text-xs text-secondary-400">S/N: {asset.serialNumber}</p>}
                  {asset.mobileNumber && <p className="text-xs text-secondary-400">📱 {asset.mobileNumber}</p>}
                </div>
                {sel && <CheckCircle2 className="w-5 h-5 text-primary-500 flex-shrink-0" />}
              </button>
            );
          })}
          {error && <p className="text-xs text-error-600">{error}</p>}
        </div>
        {allAvailable.length > 0 && (
          <div className="flex gap-3 px-5 py-4 border-t border-secondary-100 bg-secondary-50">
            <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-secondary-200 text-sm font-semibold text-secondary-700 hover:bg-secondary-100 transition-colors">Cancel</button>
            <button onClick={async () => {
              if (!selectedId) { setError('Please select an asset first'); return; }
              setIsSubmitting(true);
              setError('');
              try {
                await assignAsset(selectedId, employeeId);
                if (onAssigned) onAssigned();
                onClose();
              } catch (err: any) {
                setError(err?.message || 'Failed to assign asset');
              } finally {
                setIsSubmitting(false);
              }
            }}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Package className="w-3.5 h-3.5" /> {isSubmitting ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Return Asset Modal ───────────────────────────────────────────────────────
function ReturnAssetModal({ assetName, assignmentId, onClose }: { assetName: string; assignmentId: string; onClose: () => void }) {
  const { returnAsset } = useAssets();
  const [condition, setCondition] = useState('good');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 border border-secondary-100">
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center mx-auto mb-3"><RotateCcw className="w-6 h-6 text-warning-600" /></div>
          <h2 className="text-base font-bold text-secondary-900">Return Asset</h2>
          <p className="text-xs text-secondary-500 mt-1">{assetName}</p>
        </div>
        <div className="mb-5">
          <label className="block text-xs font-semibold text-secondary-600 mb-1.5">Condition</label>
          <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-secondary-200 bg-secondary-50 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400">
            <option value="good">Good</option><option value="minor_damage">Minor damage</option><option value="major_damage">Major damage</option><option value="lost">Lost</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-secondary-200 text-sm font-semibold text-secondary-700 hover:bg-secondary-50 transition-colors">Cancel</button>
          <button onClick={() => { returnAsset(assignmentId, condition); onClose(); }} className="flex-1 px-4 py-2 rounded-xl bg-warning-600 hover:bg-warning-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors"><RotateCcw className="w-3.5 h-3.5" /> Return</button>
        </div>
      </div>
    </div>
  );
}

// ─── Deactivate Modal ─────────────────────────────────────────────────────────
function DeactivateModal({ employeeName, onClose, onConfirm, busy = false }: { employeeName: string; onClose: () => void; onConfirm: (r: string) => void; busy?: boolean }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-secondary-100">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-error-100 bg-error-50">
          <div className="w-10 h-10 rounded-xl bg-error-100 flex items-center justify-center"><UserX className="w-5 h-5 text-error-600" /></div>
          <div><h2 className="text-sm font-bold text-secondary-900">Deactivate Employee</h2><p className="text-xs text-secondary-500">Removes login access for {employeeName}</p></div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 bg-error-50 rounded-xl border border-error-100">
            <AlertTriangle className="w-4 h-4 text-error-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-error-700 leading-relaxed">Login access will be removed. All data is preserved and can be restored.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-600 mb-1.5">Reason <span className="text-error-500">*</span></label>
            <textarea value={reason} onChange={e => { setReason(e.target.value); setError(''); }} rows={3} placeholder="e.g. Resigned, Contract ended..." className="w-full px-3.5 py-2.5 rounded-xl border border-secondary-200 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-error-400/20 focus:border-error-400 resize-none" />
            {error && <p className="text-xs text-error-600 mt-1">{error}</p>}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-secondary-100 bg-secondary-50">
          <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2 rounded-xl border border-secondary-200 text-sm font-semibold text-secondary-700 hover:bg-secondary-100 transition-colors disabled:opacity-50">Cancel</button>
          <button disabled={busy} onClick={() => { if (!reason.trim()) { setError('Reason required'); return; } onConfirm(reason); }} className="flex-1 px-4 py-2 rounded-xl bg-error-600 hover:bg-error-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">{busy ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Deactivating...</> : <><UserX className="w-3.5 h-3.5" /> Deactivate</>}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteEmployeeModal({ employeeName, employeeCode, onClose, onConfirm }: { employeeName: string; employeeCode: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = typed.trim().toLowerCase() === String(employeeCode || '').trim().toLowerCase();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-secondary-100">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-error-100 bg-error-50">
          <div className="w-10 h-10 rounded-xl bg-error-100 flex items-center justify-center"><Trash2 className="w-5 h-5 text-error-600" /></div>
          <div><h2 className="text-sm font-bold text-secondary-900">Delete Employee</h2><p className="text-xs text-secondary-500">Permanently remove {employeeName} everywhere</p></div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 bg-error-50 rounded-xl border border-error-100">
            <AlertTriangle className="w-4 h-4 text-error-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-error-700 leading-relaxed">This deletes the employee from HRMS, knockturn.cloud, TimeStrap, PMS and LMS. This cannot be undone. To keep the data and only block login, use Deactivate instead.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-secondary-600 mb-1.5">Type the employee ID <span className="font-bold">{employeeCode}</span> to confirm</label>
            <input value={typed} onChange={e => setTyped(e.target.value)} disabled={busy} className="w-full px-3.5 py-2.5 rounded-xl border border-secondary-200 text-sm text-secondary-900 focus:outline-none focus:ring-2 focus:ring-error-400/20 focus:border-error-400" />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-secondary-100 bg-secondary-50">
          <button onClick={onClose} disabled={busy} className="flex-1 px-4 py-2 rounded-xl border border-secondary-200 text-sm font-semibold text-secondary-700 hover:bg-secondary-100 transition-colors disabled:opacity-50">Cancel</button>
          <button disabled={!matches || busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }} className="flex-1 px-4 py-2 rounded-xl bg-error-600 hover:bg-error-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><Trash2 className="w-3.5 h-3.5" /> {busy ? 'Deleting...' : 'Delete everywhere'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { getEmployeeAssets, assetTypes } = useAssets();

  const [employeeData, setEmployeeData] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'qualifications' | 'activity'>('info');
  const [infoSubTab, setInfoSubTab] = useState<'basic' | 'emergency'>('basic');
  const [showEdit, setShowEdit] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [showAssignAsset, setShowAssignAsset] = useState(false);
  const [returnTarget, setReturnTarget] = useState<{ assignmentId: string; assetName: string } | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    animationType: 'contract' | 'delete' | 'tick';
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    animationType: 'tick',
  });

  const fetchData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [emp, depts, emps, tsk, ts, lv, prj, asgn] = await Promise.all([
        api.get(`/api/employees/${id}`),
        api.get('/api/departments').catch(() => []),
        api.get('/api/employees').catch(() => []),
        api.get(`/api/tasks?assignedTo=${id}`).catch(() => []),
        api.get('/api/timesheets').catch(() => []),
        api.get('/api/leave-requests').catch(() => []),
        api.get('/api/projects').catch(() => []),
        api.get('/api/projects/assignments/all').catch(() => []),
      ]);
      // Normalize employee data: map emergencyContacts -> emergencyContact (for view)
      if (emp) {
        if (emp.emergencyContacts && !emp.emergencyContact) {
          emp.emergencyContact = Array.isArray(emp.emergencyContacts) ? emp.emergencyContacts[0] : emp.emergencyContacts;
        } else if (Array.isArray(emp.emergencyContact) && emp.emergencyContact.length > 0) {
          emp.emergencyContact = emp.emergencyContact[0];
        }
      }
      setEmployeeData(emp);
      setDepartments(depts);
      setAllEmployees(emps);
      setTasks(tsk);
      const tsArray = Array.isArray(ts) ? ts : (ts?.timeEntries || []);
      setTimesheets(tsArray.filter((t: any) => t.employeeId === id));
      setLeaveRequests((lv?.history || []).filter((l: any) => l.employeeId === id || l.employee_id === id));
      setProjects(prj);
      setProjectAssignments(asgn);
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-3">
      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      <p className="text-sm text-secondary-500">Loading profile...</p>
    </div>
  );

  if (!employeeData) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <User className="w-14 h-14 text-secondary-300" />
      <p className="text-secondary-500 font-medium">Employee not found</p>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary-200 text-sm font-semibold text-secondary-700 hover:bg-secondary-50 transition-colors"><ArrowLeft className="w-4 h-4" /> Go Back</button>
    </div>
  );

  const department = departments.find(d => d.id === employeeData.departmentId);
  const manager = allEmployees.find(e => e.id === employeeData.reportingManagerId);

  // Peers: same department AND not self AND not admin/hr (actual coworkers) — only show if dept is assigned
  const peers = employeeData.departmentId
    ? allEmployees.filter(e => e.id !== employeeData.id && e.departmentId === employeeData.departmentId).slice(0, 5)
    : [];

  const employeeTasks = tasks.filter(t => t.assignedTo === employeeData.id);
  const employeeProjects = projectAssignments
    .filter(pa => pa.employeeId === employeeData.id)
    .map(pa => projects.find(p => p.id === pa.projectId))
    .filter(Boolean);
  const employeeAssets = getEmployeeAssets(employeeData.id);
  const managersList = allEmployees.filter(e => ['admin', 'manager', 'hr'].includes(e.role));

  const isInactive = (employeeData.status || '').toLowerCase() === 'inactive';

  const handleSave = async (data: any) => {
    const updated = await api.put(`/api/employees/${employeeData.id}`, data);
    setEmployeeData(updated);
  };
  const handleDeactivate = async (reason: string) => {
    setIsDeactivating(true);
    try {
      const u = await api.put(`/api/employees/${employeeData.id}/deactivate`, { reason });
      if (u?.sync?.notFound?.length) alert(`Heads up: no matching employee was found in ${u.sync.notFound.join(', ')}, so nothing was deactivated there. Check the employee code/email in that system.`);
      setEmployeeData((prev: any) => ({ ...prev, ...u, status: 'Inactive' }));
      setShowDeactivate(false);
      fetchData();
      setFeedbackModal({
        isOpen: true,
        title: 'Account Deactivated',
        subtitle: `${employeeData.firstName} ${employeeData.lastName}'s login access has been deactivated.`,
        animationType: 'tick',
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsDeactivating(false);
    }
  };
  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      const u = await api.put(`/api/employees/${employeeData.id}/reactivate`);
      if (u?.sync?.notFound?.length) alert(`Heads up: no matching employee was found in ${u.sync.notFound.join(', ')}, so nothing was reactivated there. Check the employee code/email in that system.`);
      setEmployeeData((prev: any) => ({ ...prev, ...u, status: 'Active' }));
      setShowReactivate(false);
      fetchData();
      setFeedbackModal({
        isOpen: true,
        title: 'Account Reactivated!',
        subtitle: `${employeeData.firstName} ${employeeData.lastName}'s login access has been successfully restored.`,
        animationType: 'tick',
      });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsReactivating(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/employees/${employeeData.id}`);
      setShowDelete(false);
      setFeedbackModal({
        isOpen: true,
        title: 'Employee Deleted',
        subtitle: `${employeeData.firstName} ${employeeData.lastName} has been removed from HRMS, knockturn.cloud, TimeStrap, PMS and LMS.`,
        animationType: 'delete',
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const roleColors: Record<string, string> = {
    admin: 'bg-error-100 text-error-700',
    manager: 'bg-warning-100 text-warning-700',
    hr: 'bg-accent-100 text-accent-700',
    employee: 'bg-secondary-100 text-secondary-600',
  };
  const statusColors: Record<string, { badge: string; dot: string }> = {
    active: { badge: 'bg-accent-100 text-accent-700', dot: 'bg-accent-500' },
    on_leave: { badge: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
    inactive: { badge: 'bg-secondary-100 text-secondary-500', dot: 'bg-secondary-400' },
  };
  const sc = statusColors[(employeeData.status || '').toLowerCase()] || statusColors.inactive;

  const tabs = [
    { key: 'info' as const, label: 'Personal Info' },
    { key: 'qualifications' as const, label: 'Qualifications' },
    { key: 'activity' as const, label: 'Tasks & Projects' },
  ];

  // Build emergency contacts list — server returns either emergencyContact (single) or emergencyContacts (array)
  // Normalize emergency contacts to the shape EmergencyContactForm expects (name/phone/alternativePhone)
  const normalizeEmergencyContact = (ec: any) => ({
    ...ec,
    name: ec.name || ec.contactName || ec.contact_name || '',
    phone: ec.phone || ec.mobileNumber || ec.mobile_number || ec.phoneNumber || ec.phone_number || '',
    alternativePhone: ec.alternativePhone || ec.alternateNumber || ec.alternate_number || ec.alternative_phone || '',
  });

  const emergencyContactsList: any[] = (() => {
    if (Array.isArray(employeeData.emergencyContacts) && employeeData.emergencyContacts.length > 0) {
      return employeeData.emergencyContacts.map(normalizeEmergencyContact);
    }
    if (employeeData.emergencyContact && typeof employeeData.emergencyContact === 'object' && !Array.isArray(employeeData.emergencyContact)) {
      return [normalizeEmergencyContact(employeeData.emergencyContact)];
    }
    return [];
  })();

  return (
    <div className="animate-fade-in space-y-5 max-w-5xl">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-medium text-secondary-500 hover:text-secondary-800 transition-colors group">
        <span className="w-7 h-7 rounded-lg bg-secondary-100 group-hover:bg-secondary-200 flex items-center justify-center transition-colors">
          <ArrowLeft className="w-3.5 h-3.5 text-secondary-600" />
        </span>
        Back
      </button>

      {/* Deactivated Banner */}
      {isInactive && (
        <div className="flex items-center gap-3 p-4 bg-error-50 border border-error-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-error-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-error-700">Account Deactivated</p>
            {employeeData.deactivationReason && <p className="text-xs text-error-600 mt-0.5">{employeeData.deactivationReason}</p>}
          </div>
          {isAdmin && <button onClick={() => setShowReactivate(true)} className="px-3 py-1.5 text-xs font-semibold border border-error-300 text-error-700 rounded-lg hover:bg-error-100 transition-colors">Reactivate</button>}
        </div>
      )}


      {/* Main Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-secondary-100 shadow-soft overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-primary-500 to-accent-500 relative">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=20 height=20 viewBox=0 0 20 20 xmlns=http://www.w3.org/2000/svg%3E%3Ccircle cx=10 cy=10 r=1 fill=white/%3E%3C/svg%3E")', backgroundSize: '20px 20px' }} />
            </div>
            <div className="px-5 pb-5">
              <div className="flex items-end justify-between -mt-10 mb-4">
                <div className="relative">
                  <div className="ring-4 ring-white rounded-xl">
                    {employeeData.profilePicture ? (
                      <div className="w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                        <img src={employeeData.profilePicture} alt={`${employeeData.firstName} ${employeeData.lastName}`} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <Avatar firstName={employeeData.firstName} lastName={employeeData.lastName} size="xl" />
                    )}
                  </div>
                  <span className={cn('absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white', sc.dot)} />
                </div>
                {isAdmin && (
                  <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-700 text-xs font-semibold border border-primary-200 transition-colors">
                    <Edit2 className="w-3 h-3" /> Edit Info
                  </button>
                )}
              </div>
              <h1 className="text-lg font-bold text-secondary-900 leading-tight">{employeeData.firstName} {employeeData.lastName}</h1>
              <p className="text-sm text-secondary-500 mt-0.5">{employeeData.designation || '—'}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', roleColors[employeeData.role] || roleColors.employee)}>{employeeData.role}</span>
                <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', sc.badge)}>{(employeeData.status || 'Active').replace('_', ' ')}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-600 font-mono">{employeeData.employeeId}</span>
              </div>
              <div className="my-4 border-t border-secondary-100" />
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                  <span className="text-secondary-700 truncate text-xs">{employeeData.email}</span>
                </div>
                {employeeData.mobileNumber && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Phone className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                    <span className="text-secondary-700 text-xs">{employeeData.mobileNumber}</span>
                  </div>
                )}
                {department && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Building2 className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                    <span className="text-secondary-700 text-xs">{department.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm">
                  <Calendar className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                  <span className="text-secondary-500 text-xs">Joined {formatDate(employeeData.joiningDate)}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <Clock className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                  <span className="text-secondary-500 text-xs">
                    Shift {employeeData.shiftStartTime?.slice(0, 5) || '—'} – {employeeData.shiftEndTime?.slice(0, 5) || '—'}
                  </span>
                </div>
                {employeeData.address && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="w-4 h-4 text-secondary-400 flex-shrink-0 mt-0.5" />
                    <span className="text-secondary-700 text-xs leading-relaxed">{employeeData.address}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {manager && (
            <div className="bg-white rounded-2xl border border-secondary-100 shadow-soft p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-400 mb-3 flex items-center gap-1.5"><Crown className="w-3 h-3" /> Reporting Manager</p>
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/profile/' + manager.id)}>
                <Avatar firstName={manager.firstName} lastName={manager.lastName} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors truncate">{manager.firstName} {manager.lastName}</p>
                  <p className="text-xs text-secondary-400 truncate">{manager.designation}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-secondary-300 group-hover:text-primary-500 transition-colors" />
              </div>
            </div>
          )}

          {isAdmin && !isInactive && (
            <button onClick={() => setShowDeactivate(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-error-200 text-error-700 text-sm font-semibold hover:bg-error-50 transition-colors">
              <UserX className="w-4 h-4" /> Deactivate Employee
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowDelete(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-error-600 text-white text-sm font-semibold hover:bg-error-700 transition-colors">
              <Trash2 className="w-4 h-4" /> Delete Employee
            </button>
          )}
        </div>


        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-secondary-100 shadow-soft overflow-hidden">
            <div className="flex border-b border-secondary-100">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={cn('flex-1 px-4 py-3.5 text-sm font-semibold transition-all border-b-2',
                    activeTab === tab.key ? 'border-primary-600 text-primary-700 bg-primary-50/50' : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50')}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'info' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-secondary-100">
                  <div>
                    <h2 className="text-base font-bold text-secondary-900">{employeeData.firstName} {employeeData.lastName}</h2>
                    {employeeData.mobileNumber && <p className="text-xs text-secondary-500 mt-0.5"><Phone className="w-3 h-3 inline mr-1" />{employeeData.mobileNumber}</p>}
                    <p className="text-xs text-secondary-500 mt-0.5"><Mail className="w-3 h-3 inline mr-1" />{employeeData.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowDetails(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-secondary-200 text-secondary-700 hover:bg-secondary-50 text-xs font-semibold transition-colors">
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </button>
                    {isAdmin && (
                      <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shadow-sm">
                        <Edit2 className="w-3.5 h-3.5" /> Edit Info
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-400 mb-1">Employee Number</p>
                    <p className="text-sm font-bold text-primary-600 font-mono">{employeeData.employeeId}</p>
                  </div>
                  {department && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-400 mb-1">Department</p>
                      <p className="text-sm font-bold text-primary-600">{department.name}</p>
                    </div>
                  )}
                </div>

                {/* CLICKABLE Sub-tabs: Basic Information / Emergency Contact */}
                <div className="mb-4">
                  <div className="inline-flex border border-secondary-200 rounded-lg overflow-hidden">
                    <button type="button" onClick={() => setInfoSubTab('basic')}
                      className={cn('px-4 py-1.5 text-xs font-semibold transition-colors',
                        infoSubTab === 'basic' ? 'bg-secondary-900 text-white' : 'text-secondary-500 hover:bg-secondary-50')}>
                      Basic Information
                    </button>
                    <button type="button" onClick={() => setInfoSubTab('emergency')}
                      className={cn('px-4 py-1.5 text-xs font-semibold transition-colors',
                        infoSubTab === 'emergency' ? 'bg-secondary-900 text-white' : 'text-secondary-500 hover:bg-secondary-50')}>
                      Emergency Contact
                    </button>
                  </div>
                </div>

                {infoSubTab === 'basic' && (
                  <>
                    <p className="text-sm font-bold text-secondary-800 mb-3">Personal Information</p>
                    <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                      {[
                        { label: 'Birth Day', value: employeeData.dateOfBirth ? formatDate(employeeData.dateOfBirth) : null },
                        { label: 'Nationality', value: employeeData.nationality },
                        { label: 'Marital Status', value: employeeData.maritalStatus ? (employeeData.maritalStatus.charAt(0).toUpperCase() + employeeData.maritalStatus.slice(1)) : null },
                        { label: 'Gender', value: employeeData.gender },
                        { label: 'Blood Group', value: employeeData.bloodGroup },
                        { label: 'Joined Date', value: formatDate(employeeData.joiningDate) },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400">{label}</p>
                          <p className={cn('text-sm font-semibold mt-0.5', value ? 'text-primary-600' : 'text-secondary-300')}>{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                    {employeeData.personalEmail && (
                      <div className="mt-5 pt-4 border-t border-secondary-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400 mb-1">Personal Email</p>
                        <p className="text-sm font-semibold text-primary-600">{employeeData.personalEmail}</p>
                      </div>
                    )}
                    {(employeeData.currentAddress || employeeData.address) && (
                      <div className="mt-5 pt-4 border-t border-secondary-100">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400 mb-1">Address</p>
                        <p className="text-sm font-semibold text-primary-600">{employeeData.currentAddress || employeeData.address}</p>
                      </div>
                    )}
                  </>
                )}

                {infoSubTab === 'emergency' && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-error-500" />
                      <p className="text-sm font-bold text-secondary-800">Emergency Contact{emergencyContactsList.length > 1 ? 's' : ''}</p>
                    </div>
                    {emergencyContactsList.length === 0 ? (
                      <div className="py-8 text-center bg-error-50 rounded-xl border border-error-100">
                        <Shield className="w-8 h-8 mx-auto text-error-300 mb-2" />
                        <p className="text-xs text-error-500">No emergency contact on file</p>
                        {isAdmin && <p className="text-[10px] text-error-400 mt-1">Use Edit Info to add one</p>}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {emergencyContactsList.map((ec: any, i: number) => (
                          <div key={i} className="bg-error-50 rounded-xl p-4 border border-error-100">
                            <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400">Name</p>
                                <p className="text-sm font-semibold text-secondary-800 mt-0.5">{ec.contactName || ec.contact_name || ec.name || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400">Relationship</p>
                                <p className="text-sm font-semibold text-secondary-800 mt-0.5 capitalize">{ec.relationship || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400">Phone</p>
                                <p className="text-sm font-semibold text-error-600 mt-0.5">{ec.mobileNumber || ec.mobile_number || ec.phone || ec.phoneNumber || '—'}</p>
                              </div>
                              {(ec.alternateNumber || ec.alternate_number || ec.alternativePhone || ec.alternative_phone) && (
                                <div className="col-span-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-400">Alternative Phone</p>
                                  <p className="text-sm font-semibold text-secondary-700 mt-0.5">{ec.alternateNumber || ec.alternate_number || ec.alternativePhone || ec.alternative_phone}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-secondary-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-bold text-secondary-800">Assigned Assets <span className="text-secondary-400 font-normal text-xs">({employeeAssets.length})</span></p>
                    {isAdmin && (
                      <button onClick={() => setShowAssignAsset(true)} className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Assign
                      </button>
                    )}
                  </div>
                  {employeeAssets.length === 0 ? (
                    <div className="py-4 flex justify-center bg-transparent">
                      <NoDataAnimation size="sm" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {employeeAssets.map(({ asset, assignment }: any) => {
                        const typeStyle = getAssetTypeStyle(asset.assetType, assetTypes);
                        const Icon = typeStyle.icon;
                        return (
                          <div key={assignment.id} className="flex items-center gap-3 p-3 bg-secondary-50 rounded-xl border border-secondary-100">
                            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', typeStyle.color)}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-secondary-900 truncate">{asset.name}</p>
                              {asset.serialNumber && <p className="text-[10px] text-secondary-400">S/N: {asset.serialNumber}</p>}
                              {asset.mobileNumber && <p className="text-[10px] text-secondary-400">📱 {asset.mobileNumber}</p>}
                            </div>
                            {isAdmin && (
                              <button onClick={() => setReturnTarget({ assignmentId: assignment.id, assetName: asset.name })}
                                className="p-1.5 rounded-lg text-warning-500 hover:bg-warning-50 transition-colors" title="Return">
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}


            {activeTab === 'qualifications' && (
              <div className="p-6 space-y-6">
                {employeeData.education && employeeData.education.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center"><GraduationCap className="w-3.5 h-3.5 text-primary-600" /></div>
                      <p className="text-sm font-bold text-secondary-800">Education</p>
                    </div>
                    <div className="space-y-3">
                      {employeeData.education.map((edu: any, i: number) => (
                        <div key={i} className="flex gap-4 p-4 bg-secondary-50 rounded-xl border border-secondary-100">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-secondary-900">{edu.degree || '—'}</p>
                            <p className="text-sm text-secondary-600 mt-0.5">{edu.institution || '—'}</p>
                            <p className="text-xs text-secondary-400 mt-1">{(edu.yearOfPassing || edu.year_of_passing || edu.year || '')}{(edu.grade ? ' · ' + edu.grade : '')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <GraduationCap className="w-12 h-12 mx-auto text-secondary-200 mb-3" />
                    <p className="text-sm text-secondary-400">No education details added</p>
                  </div>
                )}

                {employeeData.skills && employeeData.skills.length > 0 && (
                  <div className="pt-4 border-t border-secondary-100">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-accent-100 flex items-center justify-center"><Star className="w-3.5 h-3.5 text-accent-600" /></div>
                      <p className="text-sm font-bold text-secondary-800">Skills</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {employeeData.skills.map((skill: string) => (
                        <span key={skill} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-accent-100 flex items-center justify-center"><Briefcase className="w-3.5 h-3.5 text-accent-600" /></div>
                    <p className="text-sm font-bold text-secondary-800">Projects <span className="text-secondary-400 font-normal">({employeeProjects.length})</span></p>
                  </div>
                  {employeeProjects.length === 0 ? (
                    <div className="py-4 flex justify-center bg-transparent">
                      <NoDataAnimation size="sm" />
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {employeeProjects.map(project => project && (
                        <div key={project.id} className="flex items-center gap-3 p-3.5 bg-secondary-50 rounded-xl border border-secondary-100">
                          <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0',
                            project.status === 'active' ? 'bg-accent-500' : project.status === 'completed' ? 'bg-primary-500' : project.status === 'delayed' ? 'bg-error-500' : 'bg-warning-500')} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-secondary-900 truncate">{project.name}</p>
                            <p className="text-xs text-secondary-400 mt-0.5">{formatDate(project.startDate)} — {project.endDate ? formatDate(project.endDate) : 'Ongoing'}</p>
                          </div>
                          <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full',
                            project.status === 'active' ? 'bg-accent-100 text-accent-700' :
                              project.status === 'completed' ? 'bg-primary-100 text-primary-700' :
                                project.status === 'delayed' ? 'bg-error-100 text-error-700' : 'bg-warning-100 text-warning-700'
                          )}>{project.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-secondary-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-primary-600" /></div>
                    <p className="text-sm font-bold text-secondary-800">Tasks <span className="text-secondary-400 font-normal">({employeeTasks.length})</span></p>
                  </div>
                  {employeeTasks.length === 0 ? (
                    <div className="py-4 flex justify-center bg-transparent">
                      <NoDataAnimation size="sm" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {employeeTasks.slice(0, 10).map(task => (
                        <div key={task.id} className="flex items-center gap-3 p-3 bg-secondary-50 rounded-xl border border-secondary-100">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                            task.status === 'completed' ? 'bg-accent-100 text-accent-600' :
                              task.status === 'in_progress' ? 'bg-primary-100 text-primary-600' : 'bg-secondary-100 text-secondary-500')}>
                            {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', task.status === 'completed' ? 'text-secondary-400 line-through' : 'text-secondary-900')}>{task.title}</p>
                            <p className="text-[10px] text-secondary-400">{task.priority} priority{task.dueDate ? ' · due ' + formatDate(task.dueDate) : ''}</p>
                          </div>
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
                            task.status === 'completed' ? 'bg-accent-100 text-accent-700' :
                              task.status === 'in_progress' ? 'bg-primary-100 text-primary-700' : 'bg-secondary-100 text-secondary-600'
                          )}>{task.status.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (() => {
        // Aadhaar/PAN/Visa scans aren't columns on the employee record —
        // they're stored as attachment rows (document_type = 'Aadhaar
        // Card' / 'PAN Card' / 'Visa Document'). Pull the most recent one
        // of each back out so the edit form shows what was actually
        // saved instead of appearing empty. We also carry the attachment
        // id through (as *ScanId) so re-saving updates that row in place
        // instead of inserting a duplicate every time.
        const latestAttachmentOfType = (type: string) => {
          const matches = (employeeData.attachments || [])
            .filter((a: any) => a.documentType === type)
            .sort((a: any, b: any) =>
              new Date(b.createdAt || b.uploadedDate || 0).getTime() -
              new Date(a.createdAt || a.uploadedDate || 0).getTime()
            );
          return matches[0] || null;
        };
        const aadhaarAttachment = latestAttachmentOfType('Aadhaar Card');
        const panAttachment = latestAttachmentOfType('PAN Card');
        const visaAttachment = latestAttachmentOfType('Visa Document');

        return (
          <EmployeeProfileForm
            initialData={{
              id: employeeData.id,
              personal: {
                firstName: employeeData.firstName,
                lastName: employeeData.lastName,
                officialEmail: employeeData.email,
                personalEmail: employeeData.personalEmail,
                profilePicture: employeeData.profilePicture,
                phone: employeeData.mobileNumber,
                dateOfBirth: employeeData.dateOfBirth,
                gender: employeeData.gender,
                bloodGroup: employeeData.bloodGroup,
                maritalStatus: employeeData.maritalStatus,
                nationality: employeeData.nationality,
                nationalId: employeeData.nationalId,
                currentAddress: employeeData.currentAddress || employeeData.address,
                permanentAddress: employeeData.permanentAddress,
                aadhaarNumber: employeeData.aadhaarNumber,
                panNumber: employeeData.panNumber,
                passportNumber: employeeData.passportNumber,
                passportIssueDate: employeeData.passportIssueDate,
                passportExpiryDate: employeeData.passportExpiryDate,
                passportScan: employeeData.passportScan,
                visaNumber: employeeData.visaNumber,
                visaType: employeeData.visaType,
                visaCountry: employeeData.visaCountry,
                visaStatus: employeeData.visaStatus,
                visaIssueDate: employeeData.visaIssueDate,
                visaExpiryDate: employeeData.visaExpiryDate,
                aadhaarScan: aadhaarAttachment?.filePath || null,
                aadhaarScanId: aadhaarAttachment?.id || null,
                panScan: panAttachment?.filePath || null,
                panScanId: panAttachment?.id || null,
                visaDocument: visaAttachment?.filePath || null,
                visaDocumentId: visaAttachment?.id || null,
              },
              job: {
                employeeId: employeeData.employeeId,
                designation: employeeData.designation,
                departmentId: employeeData.departmentId,
                reportingManagerId: employeeData.reportingManagerId,
                joiningDate: employeeData.joiningDate,
                role: employeeData.role,
                employmentStatus: employeeData.status,
                employmentType: employeeData.employmentType,
                workLocation: employeeData.workLocation,
                shiftStartTime: employeeData.shiftStartTime,
                shiftEndTime: employeeData.shiftEndTime,
              },
              salary: employeeData.salaryDetails || {},
              education: employeeData.education || [],
              experience: employeeData.experience || [],
              certifications: employeeData.certifications || [],
              emergency: emergencyContactsList,
              attachments: employeeData.attachments || [],
              // Assets are tracked live via AssetsContext inside AssetsForm
              // ("Currently Assigned" section) — this array is only for
              // staged/pending assignments during the current edit session,
              // so it should always start empty, not be pre-filled with
              // already-saved assets.
              assets: [],
            }}
            onClose={() => {
              setShowEdit(false);
              fetchData();
            }}
            onSaved={() => { setShowEdit(false); fetchData(); }}
          />
        );
      })()}

      {showDetails && (
        <EmployeeDetailsModal
          employee={employeeData}
          departmentName={department?.name}
          managerName={manager ? `${manager.firstName} ${manager.lastName}` : undefined}
          emergencyContacts={emergencyContactsList}
          assets={employeeAssets}
          onClose={() => setShowDetails(false)}
        />
      )}

      {showDelete && <DeleteEmployeeModal employeeName={employeeData.firstName + ' ' + employeeData.lastName} employeeCode={employeeData.employeeId} onClose={() => setShowDelete(false)} onConfirm={handleDelete} />}
      {showDeactivate && <DeactivateModal employeeName={employeeData.firstName + ' ' + employeeData.lastName} onClose={() => setShowDeactivate(false)} onConfirm={handleDeactivate} busy={isDeactivating} />}
      {showAssignAsset && <AssignAssetModal employeeId={employeeData.id} employeeName={employeeData.firstName + ' ' + employeeData.lastName} onClose={() => setShowAssignAsset(false)} onAssigned={fetchData} />}
      {returnTarget && <ReturnAssetModal assetName={returnTarget.assetName} assignmentId={returnTarget.assignmentId} onClose={() => setReturnTarget(null)} />}

      {showReactivate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isReactivating && setShowReactivate(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7 text-center border border-secondary-100">
            <div className="w-14 h-14 rounded-xl bg-accent-100 flex items-center justify-center mx-auto mb-4"><UserCheck className="w-7 h-7 text-accent-600" /></div>
            <h2 className="text-base font-bold text-secondary-900 mb-2">Reactivate Account</h2>
            <p className="text-sm text-secondary-500 mb-6">Restore {employeeData.firstName}'s login access and mark as active.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowReactivate(false)} disabled={isReactivating} className="flex-1 px-4 py-2.5 rounded-xl border border-secondary-200 text-sm font-semibold text-secondary-700 hover:bg-secondary-50 transition-colors disabled:opacity-50">Cancel</button>
              <button onClick={handleReactivate} disabled={isReactivating} className="flex-1 px-4 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">{isReactivating ? <><span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Reactivating...</> : <><UserCheck className="w-4 h-4" /> Reactivate</>}</button>
            </div>
          </div>
        </div>
      )}

      <SuccessAnimationModal
        isOpen={feedbackModal.isOpen}
        title={feedbackModal.title}
        subtitle={feedbackModal.subtitle}
        animationType={feedbackModal.animationType}
        onClose={() => {
          const wasDelete = feedbackModal.animationType === 'delete';
          setFeedbackModal(prev => ({ ...prev, isOpen: false }));
          if (wasDelete) navigate('/employees');
        }}
      />
    </div>
  );
}