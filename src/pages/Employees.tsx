import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, SortAsc, SortDesc, X, ChevronRight, RefreshCw } from 'lucide-react';
import { useDepartments } from '../context/DepartmentsContext';
import { formatDate, cn } from '../utils/formatters';
import type { Role, BloodGroup, MaritalStatus, EducationDetail } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type SortField = 'firstName' | 'joiningDate' | 'status' | 'department';
type SortDir = 'asc' | 'desc';

import EmployeeProfileForm from '../components/employees/EmployeeProfileForm';

// ─── Employees Page ───────────────────────────────────────────────────────────

export default function Employees() {

  const [employees, setEmployees] = useState<any[]>([]);
  const [leavesData, setLeavesData] = useState<any>({ history: [], lmsUsers: [] });
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchEmployees = async () => {
    try {
      setIsLoadingData(true);
      const [empData, lvData] = await Promise.all([
        api.get('/api/employees').catch(() => []),
        api.get('/api/leave-requests').catch(() => ({ history: [], lmsUsers: [] }))
      ]);
      setEmployees(empData);
      setLeavesData(lvData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSyncLMS = async () => {
    try {
      setIsSyncing(true);
      const res = await api.post('/api/admin/seed-lms-employees');
      alert(res.message || 'Sync complete');
      if (res.added > 0) {
        fetchEmployees();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to sync LMS employees');
    } finally {
      setIsSyncing(false);
    }
  };

  const { isAdmin } = useAuth();
  const { departments } = useDepartments();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('firstName');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const todayStr = new Date().toLocaleDateString('en-CA');

  const getLmsUserIdFromEmployee = (emp: any) => {
    if (!emp || !emp.email) return null;
    const lmsUsers = leavesData?.lmsUsers || [];
    const lmsUser = lmsUsers.find((u: any) => u.email && u.email.toLowerCase().trim() === emp.email.toLowerCase().trim());
    return lmsUser?.userId || null;
  };

  const isOnLeaveToday = (emp: any) => {
    const empLmsId = getLmsUserIdFromEmployee(emp);
    if (!empLmsId) return false;
    return (leavesData?.history || []).some((l: any) => {
      const isApproved = (l.status || '').toLowerCase() === 'approved';
      if (!isApproved || l.userId !== empLmsId) return false;
      const start = l.startDate ? new Date(l.startDate).toLocaleDateString('en-CA') : '';
      const end = l.endDate ? new Date(l.endDate).toLocaleDateString('en-CA') : '';
      return start <= todayStr && end >= todayStr;
    });
  };

  const employeesWithStatus = useMemo(() => {
    return employees.map(e => ({
      ...e,
      displayStatus: isOnLeaveToday(e) ? 'On Leave' : (e.status || 'Active')
    }));
  }, [employees, leavesData, todayStr]);

  const filteredEmployees = useMemo(() => {
    let filtered = [...employeesWithStatus];
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(e =>
        (e.firstName || '').toLowerCase().includes(term) ||
        (e.lastName || '').toLowerCase().includes(term) ||
        (e.employeeId || '').toLowerCase().includes(term) ||
        (e.email || '').toLowerCase().includes(term) ||
        (e.designation || '').toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => {
        const dStat = e.displayStatus?.toLowerCase() || '';
        if (statusFilter === 'active') return dStat === 'active';
        if (statusFilter === 'on_leave') return dStat === 'on_leave' || dStat === 'on leave';
        if (statusFilter === 'inactive') return dStat === 'inactive';
        return true;
      });
    }
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'firstName') comparison = a.firstName.localeCompare(b.firstName);
      else if (sortField === 'joiningDate') comparison = new Date(a.joiningDate).getTime() - new Date(b.joiningDate).getTime();
      else if (sortField === 'department') {
        const deptA = departments.find(d => d.id === a.departmentId)?.name || '';
        const deptB = departments.find(d => d.id === b.departmentId)?.name || '';
        comparison = deptA.localeCompare(deptB);
      }
      return sortDir === 'asc' ? comparison : -comparison;
    });
    return filtered;
  }, [employeesWithStatus, departments, search, sortField, sortDir, statusFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const counts = useMemo(() => ({
    total: employeesWithStatus.length,
    active: employeesWithStatus.filter(e => e.displayStatus?.toLowerCase() === 'active').length,
    onLeave: employeesWithStatus.filter(e => e.displayStatus?.toLowerCase() === 'on_leave' || e.displayStatus?.toLowerCase() === 'on leave').length,
    inactive: employeesWithStatus.filter(e => e.displayStatus?.toLowerCase() === 'inactive').length,
  }), [employeesWithStatus]);

  if (isLoadingData) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full" />
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Employees</h1>
          <p className="text-secondary-600 dark:text-surface-400 mt-1">{counts.total} total employees</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncLMS}
              disabled={isSyncing}
              className="btn-secondary"
            >
              <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
              {isSyncing ? 'Syncing...' : 'Sync from LMS'}
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        )}
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: counts.total, color: 'bg-primary-100 text-primary-700', filter: 'all' },
          { label: 'Active', value: counts.active, color: 'bg-success-100 text-success-700', filter: 'active' },
          { label: 'On Leave', value: counts.onLeave, color: 'bg-warning-100 text-warning-700', filter: 'on_leave' },
          { label: 'Inactive', value: counts.inactive, color: 'bg-error-100 text-error-700', filter: 'inactive' },
        ].map(s => (
          <button
            key={s.filter}
            onClick={() => setStatusFilter(s.filter)}
            className={cn('card p-4 text-left transition-all', statusFilter === s.filter && 'ring-2 ring-primary-500')}
          >
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{s.value}</p>
            <span className={cn('badge mt-1', s.color)}>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary-400" />
            <input
              type="text"
              name="employee-search"
              autoComplete="off"
              placeholder="Search by name, ID, email, or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('firstName')} className="flex items-center gap-1 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:text-secondary-700 dark:hover:text-surface-200">
                    Employee
                    {sortField === 'firstName' && (sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('department')} className="flex items-center gap-1 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:text-secondary-700 dark:hover:text-surface-200">
                    Department
                    {sortField === 'department' && (sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left">
                  <button onClick={() => toggleSort('joiningDate')} className="flex items-center gap-1 text-xs font-semibold text-secondary-500 uppercase tracking-wider hover:text-secondary-700 dark:hover:text-surface-200">
                    Joined
                    {sortField === 'joiningDate' && (sortDir === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />)}
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-500 uppercase tracking-wider">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-secondary-400">No employees found</td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => {
                  const department = departments.find(d => d.id === employee.departmentId);
                  return (
                    <tr key={employee.id} className={cn('hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors', employee.status === 'inactive' && 'opacity-60')}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 overflow-hidden',
                            employee.status?.toLowerCase() === 'inactive' ? 'bg-secondary-100 text-secondary-500' : 'bg-gradient-to-br from-primary-400 to-accent-500 text-white'
                          )}>
                            {employee.profilePicture ? (
                              <img src={employee.profilePicture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <>{employee.firstName.charAt(0)}{employee.lastName.charAt(0)}</>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-secondary-900 dark:text-white">{employee.firstName} {employee.lastName}</p>
                            <p className="text-xs text-secondary-500">{employee.employeeId} · {employee.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-secondary-900 dark:text-white">{department?.name || 'N/A'}</p>
                        <p className="text-xs text-secondary-500">{employee.designation}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn('badge',
                          employee.role === 'admin' ? 'bg-error-100 text-error-700' :
                            employee.role === 'manager' ? 'bg-warning-100 text-warning-700' :
                              employee.role === 'hr' ? 'bg-accent-100 text-accent-700' :
                                'bg-secondary-100 text-secondary-700'
                        )}>
                          {employee.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <div className={cn('w-2 h-2 rounded-full',
                            employee.displayStatus?.toLowerCase() === 'active' ? 'bg-success-500' :
                              (employee.displayStatus?.toLowerCase() === 'on_leave' || employee.displayStatus?.toLowerCase() === 'on leave') ? 'bg-warning-500' :
                                'bg-error-500'
                          )} />
                          <span className={cn('badge capitalize',
                            employee.displayStatus?.toLowerCase() === 'active' ? 'badge-success' :
                              (employee.displayStatus?.toLowerCase() === 'on_leave' || employee.displayStatus?.toLowerCase() === 'on leave') ? 'badge-warning' :
                                'badge-error'
                          )}>
                            {employee.displayStatus.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-secondary-600 dark:text-surface-300">
                        {formatDate(employee.joiningDate)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link to={`/profile/${employee.id}`} className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                          View <ChevronRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <EmployeeProfileForm onClose={() => { setShowAddModal(false); fetchEmployees(); }} onSaved={() => { setShowAddModal(false); fetchEmployees(); }} />}
    </div>
  );
}