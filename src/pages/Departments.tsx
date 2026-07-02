import { useState, useEffect } from 'react';
import { useDepartments } from '../context/DepartmentsContext';
import { Building2, Users, Search, Plus, Edit2, Trash2, X, LayoutGrid, List } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/formatters';

function DepartmentModal({ onClose, dept, isEdit }: { onClose: () => void; dept?: any; isEdit?: boolean }) {
  const { addDepartment, updateDepartment } = useDepartments();
  const [name, setName] = useState(dept?.name || '');
  const [description, setDescription] = useState(dept?.description || '');
  const [managerIds, setManagerIds] = useState<string[]>(dept?.managerIds || []);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingEmps, setIsLoadingEmps] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/employees')
      .then(setEmployees)
      .catch(console.error)
      .finally(() => setIsLoadingEmps(false));
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Department name is required'); return; }
    try {
      const payload = {
        name,
        description,
        managerIds,
        createdAt: new Date().toISOString()
      };
      if (isEdit && dept?.id) {
        await updateDepartment(dept.id, payload);
      } else {
        await addDepartment(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save department');
    }
  };

  const toggleManager = (id: string) => {
    setManagerIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-200 dark:border-surface-800">
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-secondary-900 dark:text-white">{isEdit ? 'Edit' : 'Add'} Department</h2>
            <p className="text-sm text-secondary-500">{isEdit ? 'Update department details' : 'Create a new organizational unit'}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          {error && <div className="p-3 bg-error-50 text-error-600 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Department Name <span className="text-error-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)} className="input-field" placeholder="e.g. Engineering" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-field h-24 resize-none" placeholder="What does this department do?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-surface-300 mb-2">Department Manager(s)</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-surface-200 dark:border-surface-700 rounded-lg p-3">
              {isLoadingEmps ? (
                <p className="text-sm text-secondary-400 text-center py-2">Loading employees...</p>
              ) : employees.filter(e => e.role === 'manager' || e.role === 'admin').length === 0 ? (
                <p className="text-sm text-secondary-400 italic py-2">No managers or admins found</p>
              ) : (
                employees.filter(e => e.role === 'manager' || e.role === 'admin').map(emp => (
                  <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={managerIds.includes(emp.id)}
                      onChange={() => toggleManager(emp.id)}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-secondary-700 dark:text-surface-300">{emp.firstName} {emp.lastName}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-800/50 rounded-b-2xl">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary flex-1">{isEdit ? 'Update' : 'Create'} Department</button>
        </div>
      </div>
    </div>
  );
}

export default function Departments() {
  const { departments, deleteDepartment } = useDepartments();
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    api.get('/api/employees').then(setEmployees).catch(console.error);
  }, []);

  const handleEdit = (dept: any) => { setEditingDept(dept); setShowModal(true); };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this department?')) {
      try { await deleteDepartment(id); }
      catch (err: any) { alert(err.message || 'Failed to delete department'); }
    }
  };

  const filteredDepartments = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  const getManagers = (dept: any) =>
    employees.filter(e => dept.managerIds?.includes(e.id));

  const getMemberCount = (dept: any) =>
    employees.filter(e => e.job?.departmentId === dept.id).length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary-500" />
            Departments
          </h1>
          <p className="text-secondary-600 dark:text-surface-400 mt-1">
            {filteredDepartments.length} department{filteredDepartments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center bg-surface-100 dark:bg-surface-800 p-1 rounded-lg">
            <button
              onClick={() => setView('grid')}
              className={cn('p-2 rounded-md transition-all', view === 'grid' ? 'bg-white dark:bg-surface-700 shadow-sm text-primary-600' : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-surface-300')}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('p-2 rounded-md transition-all', view === 'list' ? 'bg-white dark:bg-surface-700 shadow-sm text-primary-600' : 'text-secondary-500 hover:text-secondary-700 dark:hover:text-surface-300')}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          {isAdmin && (
            <button onClick={() => { setEditingDept(null); setShowModal(true); }} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Department
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search departments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 bg-surface-50 dark:bg-surface-800/50 border-transparent focus:bg-white dark:focus:bg-surface-900"
          />
        </div>
      </div>

      {/* Empty state */}
      {filteredDepartments.length === 0 && (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 mx-auto text-secondary-200 mb-3" />
          <p className="text-secondary-400 font-medium">No departments found</p>
          {search && <p className="text-sm text-secondary-400 mt-1">Try adjusting your search</p>}
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {view === 'grid' && filteredDepartments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map(dept => {
            const managers = getManagers(dept);
            const memberCount = getMemberCount(dept);
            return (
              <div key={dept.id} className="card p-6 group hover:-translate-y-1 transition-all duration-300 relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-surface-300 text-xs font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      {memberCount}
                    </div>
                    {isAdmin && (
                      <>
                        <button onClick={() => handleEdit(dept)} className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-primary-600" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(dept.id)} className="p-2 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors text-error-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{dept.name}</h3>
                <p className="text-sm text-secondary-600 dark:text-surface-400 line-clamp-2 mb-6 min-h-[40px]">
                  {dept.description || 'No description provided.'}
                </p>
                <div className="pt-4 border-t border-surface-200 dark:border-surface-800">
                  <p className="text-xs font-medium text-secondary-500 mb-2">Manager(s)</p>
                  {managers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {managers.map(manager => (
                        <div key={manager.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20">
                          <div className="w-5 h-5 rounded-full bg-primary-200 dark:bg-primary-700 flex items-center justify-center text-primary-700 dark:text-primary-300 text-xs font-bold">
                            {(manager.firstName || '?').charAt(0)}{(manager.lastName || '').charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-secondary-900 dark:text-white">{manager.firstName} {manager.lastName}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-secondary-400 italic">No managers assigned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && filteredDepartments.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Department</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Description</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Members</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Manager(s)</th>
                  {isAdmin && (
                    <th className="px-5 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {filteredDepartments.map(dept => {
                  const managers = getManagers(dept);
                  const memberCount = getMemberCount(dept);
                  return (
                    <tr key={dept.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-semibold text-secondary-900 dark:text-white">{dept.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-sm text-secondary-500 dark:text-surface-400 truncate">
                          {dept.description || <span className="italic text-secondary-300">No description</span>}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-800 text-secondary-600 dark:text-surface-300 text-xs font-medium">
                          <Users className="w-3.5 h-3.5" />
                          {memberCount}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {managers.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {managers.map(m => (
                              <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-xs font-medium text-primary-700 dark:text-primary-300">
                                <span className="w-4 h-4 rounded-full bg-primary-200 dark:bg-primary-700 inline-flex items-center justify-center text-[9px] font-bold text-primary-700 dark:text-primary-200">
                                  {(m.firstName || '?').charAt(0)}{(m.lastName || '').charAt(0)}
                                </span>
                                {m.firstName} {m.lastName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-secondary-400 italic">Unassigned</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleEdit(dept)} className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors text-primary-600" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(dept.id)} className="p-2 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors text-error-600" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <DepartmentModal
          dept={editingDept}
          isEdit={!!editingDept}
          onClose={() => { setShowModal(false); setEditingDept(null); }}
        />
      )}
    </div>
  );
}
