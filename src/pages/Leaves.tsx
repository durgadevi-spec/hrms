import { useState, useMemo, useEffect } from 'react';
import { Calendar, Check, X, Clock, Sun, Coffee, FileText, AlertCircle, Search, RefreshCw, Clock4, ShieldAlert, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, cn } from '../utils/formatters';

const statusConfig: Record<string, { color: string; icon: any }> = {
  Pending: { color: 'bg-warning-100 text-warning-700', icon: Clock },
  Approved: { color: 'bg-success-100 text-success-700', icon: Check },
  Rejected: { color: 'bg-error-100 text-error-700', icon: X },
  Cancelled: { color: 'bg-secondary-100 text-secondary-600', icon: X },
};

function getStatusConfig(status: string | undefined) {
  if (!status) return statusConfig['Pending'];
  const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return statusConfig[normalized] || statusConfig['Pending'];
}

export default function Leaves() {
  const [activeTab, setActiveTab] = useState<'leaves' | 'permissions' | 'calendar'>('leaves');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [balances, setBalances] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [lmsUsers, setLmsUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLmsAdmin, setIsLmsAdmin] = useState(false);
  const [syncTime, setSyncTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLmsData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get('/api/leave-requests');
      setBalances(data.balances || []);
      setHistory(data.history || []);
      setPermissions(data.permissions || []);
      setLmsUsers(data.lmsUsers || []);
      setIsLmsAdmin(data.isLmsAdmin);
      setSyncTime(data.syncTime);

      // Admins/HR/managers need the employee directory too, so leave and
      // permission records (which only carry an LMS user_id) can be matched
      // back to a real employee name via their email.
      if (data.isLmsAdmin) {
        try {
          const emps = await api.get('/api/employees');
          setEmployees(emps || []);
        } catch (e) {
          console.warn('Failed to load employee directory for name lookup:', e);
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch LMS data:', e);
      setError(e.message || 'Failed to sync with LMS database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLmsData(); }, []);

  // Map LMS user_id -> a real employee display name (matched by email),
  // falling back to the LMS email, then finally the raw user_id.
  const employeeNameByUserId = useMemo(() => {
    const map: Record<string, string> = {};
    lmsUsers.forEach((u: any) => {
      if (!u.userId) return;
      const email = (u.email || '').toLowerCase().trim();
      const emp = email ? employees.find((e: any) => (e.email || '').toLowerCase().trim() === email) : null;
      map[u.userId] = emp ? `${emp.firstName} ${emp.lastName}` : (u.email || u.userId);
    });
    return map;
  }, [lmsUsers, employees]);

  const getEmployeeName = (userId: string | undefined) => (userId && employeeNameByUserId[userId]) || userId || 'Unknown';

  // Unique employees present in the leave/permission data, for the
  // employee-wise filter dropdown.
  const employeeOptions = useMemo(() => {
    const ids = new Set<string>([
      ...history.map((l: any) => l.userId),
      ...permissions.map((p: any) => p.userId)
    ].filter(Boolean));
    return Array.from(ids)
      .map(id => ({ id, name: getEmployeeName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [history, permissions, employeeNameByUserId]);

  const myBalance = balances[0] || { casualTotal: 0, casualUsed: 0, sickTotal: 0, sickUsed: 0 };

  // Filtered Leaves
  const filteredHistory = useMemo(() => {
    let list = history;
    if (statusFilter !== 'all') {
      list = list.filter(l => (l.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (isLmsAdmin && employeeFilter !== 'all') {
      list = list.filter(l => String(l.userId) === String(employeeFilter));
    }
    if (searchQuery && isLmsAdmin) {
      const q = searchQuery.toLowerCase();
      list = list.filter(l =>
        (l.userId || '').toLowerCase().includes(q) ||
        getEmployeeName(l.userId).toLowerCase().includes(q)
      );
    }
    return list;
  }, [history, statusFilter, employeeFilter, searchQuery, isLmsAdmin, employeeNameByUserId]);

  // Filtered Permissions
  const filteredPermissions = useMemo(() => {
    let list = permissions;
    if (statusFilter !== 'all') {
      list = list.filter(p => (p.status || '').toLowerCase() === statusFilter.toLowerCase());
    }
    if (isLmsAdmin && employeeFilter !== 'all') {
      list = list.filter(p => String(p.userId) === String(employeeFilter));
    }
    if (searchQuery && isLmsAdmin) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        (p.userId || '').toLowerCase().includes(q) ||
        getEmployeeName(p.userId).toLowerCase().includes(q)
      );
    }
    return list;
  }, [permissions, statusFilter, employeeFilter, searchQuery, isLmsAdmin, employeeNameByUserId]);

  // Global Computed Stats
  const stats = useMemo(() => {
    const approvedLeaves = history.filter(l => (l.status || '').toLowerCase() === 'approved').length;
    const pendingLeaves = history.filter(l => (l.status || '').toLowerCase() === 'pending').length;
    const rejectedLeaves = history.filter(l => (l.status || '').toLowerCase() === 'rejected').length;

    const approvedPerms = permissions.filter(p => (p.status || '').toLowerCase() === 'approved');
    const totalApprovedPermissions = approvedPerms.length;
    const totalApprovedPermissionHours = approvedPerms.reduce((sum, p) => sum + parseFloat(p.totalHours || '0'), 0);
    const permissionsExceeding3Hrs = approvedPerms.filter(p => parseFloat(p.totalHours || '0') > 3).length;

    return {
      approvedLeaves,
      pendingLeaves,
      rejectedLeaves,
      totalApprovedPermissions,
      totalApprovedPermissionHours,
      permissionsExceeding3Hrs
    };
  }, [history, permissions]);

  // Calendar Logic
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null); // Empty slots
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return days;
  }, [currentMonth]);

  // Monthly Stats (Computed from currentMonth)
  const monthlyStats = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const permsThisMonth = permissions.filter(p => {
      if (!p.permissionDate) return false;
      const d = new Date(p.permissionDate);
      return d.getFullYear() === year && d.getMonth() === month && (p.status || '').toLowerCase() === 'approved';
    });

    const leavesThisMonth = history.filter(l => {
      if (!l.startDate) return false;
      const d = new Date(l.startDate);
      return d.getFullYear() === year && d.getMonth() === month && (l.status || '').toLowerCase() === 'approved';
    });

    return {
      permissionsCount: permsThisMonth.length,
      permissionHours: permsThisMonth.reduce((sum, p) => sum + parseFloat(p.totalHours || '0'), 0),
      leavesCount: leavesThisMonth.length
    };
  }, [currentMonth, permissions, history]);

  // Helper to check if a day has leaves or permissions
  const getDayEvents = (date: Date | null) => {
    if (!date) return { leaves: [], perms: [] };
    const dateStr = date.toISOString().split('T')[0];

    const leaves = history.filter(l => l.startDate && l.startDate.startsWith(dateStr));
    const perms = permissions.filter(p => p.permissionDate && p.permissionDate.startsWith(dateStr));

    return { leaves, perms };
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary-500" />
            Leave & Permissions (LMS)
          </h1>
          <p className="text-secondary-600 dark:text-surface-400 mt-1 flex items-center gap-2">
            Read-only mode. Live sync from external LMS database.
            {syncTime && (
              <span className="text-xs bg-surface-200 dark:bg-surface-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-primary-500" />
                Last sync: {new Date(syncTime).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Primary KPI Cards (Balances for Employee, Overall Totals for Admin) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {!isLmsAdmin ? (
          <>
            <LeaveBalanceCard type="Total Casual Leave" balance={myBalance.casualTotal} icon={Sun} color="primary" />
            <LeaveBalanceCard type="Remaining Casual" balance={Math.max(0, myBalance.casualTotal - myBalance.casualUsed)} icon={Sun} color="primary" />
            <LeaveBalanceCard type="Total Sick Leave" balance={myBalance.sickTotal} icon={Coffee} color="error" />
            <LeaveBalanceCard type="Remaining Sick" balance={Math.max(0, myBalance.sickTotal - myBalance.sickUsed)} icon={Coffee} color="error" />
          </>
        ) : (
          <>
            <div className="card p-3 border-l-4 border-l-primary-500">
              <p className="text-xs text-secondary-600 dark:text-surface-400 mb-0.5">Total LMS Leaves</p>
              <p className="text-xl font-bold text-secondary-900 dark:text-white">{history.length}</p>
            </div>
            <div className="card p-3 border-l-4 border-l-warning-500">
              <p className="text-xs text-secondary-600 dark:text-surface-400 mb-0.5">Pending Leaves</p>
              <p className="text-xl font-bold text-warning-600">{stats.pendingLeaves}</p>
            </div>
            <div className="card p-3 border-l-4 border-l-success-500">
              <p className="text-xs text-secondary-600 dark:text-surface-400 mb-0.5">Approved Leaves</p>
              <p className="text-xl font-bold text-success-600">{stats.approvedLeaves}</p>
            </div>
            <div className="card p-3 border-l-4 border-l-error-500">
              <p className="text-xs text-secondary-600 dark:text-surface-400 mb-0.5">Rejected Leaves</p>
              <p className="text-xl font-bold text-error-600">{stats.rejectedLeaves}</p>
            </div>
          </>
        )}
      </div>

      {/* Secondary KPI Cards (Counts & Permissions for both Employee and Admin) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-3 flex justify-between items-center bg-surface-50 dark:bg-surface-800/50">
          <div>
            <p className="text-xs text-secondary-600 dark:text-surface-400">Total Approved Permissions</p>
            <p className="text-lg font-bold text-secondary-900 dark:text-white mt-0.5">{stats.totalApprovedPermissions}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-success-100 text-success-600 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
        </div>

        <div className="card p-3 flex justify-between items-center bg-surface-50 dark:bg-surface-800/50">
          <div>
            <p className="text-xs text-secondary-600 dark:text-surface-400">Approved Permission Hours</p>
            <p className="text-lg font-bold text-secondary-900 dark:text-white mt-0.5">{stats.totalApprovedPermissionHours.toFixed(2)} <span className="text-xs font-normal text-secondary-500">hrs</span></p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
            <Clock4 className="w-4 h-4" />
          </div>
        </div>

        <div className="card p-3 flex justify-between items-center bg-surface-50 dark:bg-surface-800/50">
          <div>
            <p className="text-xs text-secondary-600 dark:text-surface-400">Permissions &gt; 3 Hours</p>
            <p className="text-lg font-bold text-error-600 mt-0.5">{stats.permissionsExceeding3Hrs}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-error-100 text-error-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-200 dark:border-surface-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('leaves')}
          className={cn(
            'px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
            activeTab === 'leaves'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-surface-300'
          )}
        >
          Leave History
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={cn(
            'px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap',
            activeTab === 'permissions'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-surface-300'
          )}
        >
          Permission History
          {stats.permissionsExceeding3Hrs > 0 && (
            <span className="bg-error-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {stats.permissionsExceeding3Hrs}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={cn(
            'px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
            activeTab === 'calendar'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-surface-300'
          )}
        >
          Calendar View
        </button>
      </div>

      {/* Loading & Error States */}
      {isLoading ? (
        <div className="card p-12 flex justify-center items-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
        </div>
      ) : error ? (
        <div className="card p-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-error-400 mb-4" />
          <p className="text-error-600 font-medium">{error}</p>
          <button onClick={fetchLmsData} className="mt-4 btn-secondary text-sm">Retry Sync</button>
        </div>
      ) : (
        <div className="space-y-4">

          {/* LEAVES TAB */}
          {activeTab === 'leaves' && (
            <>
              {/* Filters & Search */}
              <div className="card p-4 flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
                  <span className="text-sm text-secondary-600 dark:text-surface-400 whitespace-nowrap">Filter:</span>
                  {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium rounded-lg transition-all capitalize whitespace-nowrap',
                        statusFilter === status
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-secondary-600 hover:bg-surface-100 dark:hover:bg-surface-800'
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                {isLmsAdmin && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={employeeFilter}
                      onChange={e => setEmployeeFilter(e.target.value)}
                      className="input-field text-sm w-full sm:w-52"
                    >
                      <option value="all">All Employees</option>
                      {employeeOptions.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                      <input type="text" placeholder="Search Emp ID, Name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-field pl-9 text-sm w-full" />
                    </div>
                  </div>
                )}
              </div>

              {filteredHistory.length === 0 ? (
                <div className="card p-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-secondary-300 dark:text-surface-600 mb-4" />
                  <p className="text-secondary-600 dark:text-surface-400 font-medium">No leave records found.</p>
                </div>
              ) : (
                filteredHistory.map((leave, index) => {
                  const statusConf = getStatusConfig(leave.status);
                  const StatusIcon = statusConf.icon;
                  const lType = (leave.leaveType || '').toLowerCase();
                  const typeColor = lType.includes('sick') ? 'bg-error-100 text-error-700' :
                    lType.includes('casual') ? 'bg-primary-100 text-primary-700' :
                      lType.includes('loss') ? 'bg-warning-100 text-warning-700' : 'bg-secondary-100 text-secondary-700';
                  const TypeIcon = lType.includes('sick') ? Coffee : lType.includes('casual') ? Sun : lType.includes('loss') ? FileText : Calendar;

                  return (
                    <div key={leave.id || index} className="card-hover p-5 border-l-4" style={{ borderLeftColor: statusConf.color.includes('warning') ? '#eab308' : statusConf.color.includes('success') ? '#22c55e' : statusConf.color.includes('error') ? '#ef4444' : '#94a3b8' }}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1', typeColor)}>
                            <TypeIcon className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-lg font-bold text-secondary-900 dark:text-white capitalize">
                                {leave.leaveType || 'Leave'}
                              </h3>
                              <span className={cn('badge', statusConf.color)}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {leave.status || 'Pending'}
                              </span>
                            </div>
                            {isLmsAdmin && (
                              <p className="text-sm font-semibold text-primary-700 dark:text-primary-400 mb-1 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" /> {getEmployeeName(leave.userId)}
                              </p>
                            )}
                            <p className="text-sm text-secondary-600 dark:text-surface-400 font-medium mb-2">
                              {leave.startDate ? formatDate(leave.startDate) : 'N/A'}
                              {leave.endDate && leave.startDate !== leave.endDate && ` — ${formatDate(leave.endDate)}`}
                            </p>
                            {leave.reason && (
                              <p className="text-sm text-secondary-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-800/50 p-2 rounded-lg italic">"{leave.reason}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* PERMISSIONS TAB */}
          {activeTab === 'permissions' && (
            <>
              {/* Filters & Search */}
              <div className="card p-4 flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
                  <span className="text-sm text-secondary-600 dark:text-surface-400 whitespace-nowrap">Filter:</span>
                  {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        'px-3 py-1.5 text-sm font-medium rounded-lg transition-all capitalize whitespace-nowrap',
                        statusFilter === status
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-secondary-600 hover:bg-surface-100 dark:hover:bg-surface-800'
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                {isLmsAdmin && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                      value={employeeFilter}
                      onChange={e => setEmployeeFilter(e.target.value)}
                      className="input-field text-sm w-full sm:w-52"
                    >
                      <option value="all">All Employees</option>
                      {employeeOptions.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                      <input type="text" placeholder="Search Emp ID, Name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input-field pl-9 text-sm w-full" />
                    </div>
                  </div>
                )}
              </div>

              {filteredPermissions.length === 0 ? (
                <div className="card p-12 text-center">
                  <Clock4 className="w-12 h-12 mx-auto text-secondary-300 dark:text-surface-600 mb-4" />
                  <p className="text-secondary-600 dark:text-surface-400 font-medium">No permission records found.</p>
                </div>
              ) : (
                filteredPermissions.map((perm, index) => {
                  const statusConf = getStatusConfig(perm.status);
                  const StatusIcon = statusConf.icon;
                  const hours = parseFloat(perm.totalHours || '0');
                  const isWarning = (perm.status || '').toLowerCase() === 'approved' && hours > 3;

                  return (
                    <div key={perm.id || index} className={cn("card-hover p-5 border-l-4", isWarning ? "bg-error-50/50 dark:bg-error-900/10" : "")} style={{ borderLeftColor: isWarning ? '#ef4444' : (statusConf.color.includes('warning') ? '#eab308' : statusConf.color.includes('success') ? '#22c55e' : statusConf.color.includes('error') ? '#ef4444' : '#94a3b8') }}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 mt-1', isWarning ? 'bg-error-100 text-error-700' : 'bg-primary-100 text-primary-700')}>
                            <Clock4 className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-lg font-bold text-secondary-900 dark:text-white capitalize">
                                {perm.permissionType ? perm.permissionType.replace('_', ' ') : 'Permission'}
                              </h3>
                              <span className={cn('badge', statusConf.color)}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {perm.status || 'Pending'}
                              </span>
                              {isWarning && (
                                <span className="badge bg-error-500 text-white border-transparent">
                                  <ShieldAlert className="w-3 h-3 mr-1" />
                                  Exceeds 3 Hours
                                </span>
                              )}
                            </div>
                            {isLmsAdmin && (
                              <p className="text-sm font-semibold text-primary-700 dark:text-primary-400 mb-1 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" /> {getEmployeeName(perm.userId)}
                              </p>
                            )}
                            <p className="text-sm text-secondary-600 dark:text-surface-400 font-medium mb-2 flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {perm.permissionDate ? formatDate(perm.permissionDate) : 'N/A'}
                              <span className="text-secondary-300">|</span>
                              <Clock className="w-4 h-4" />
                              {perm.fromTime} — {perm.toTime}
                              <span className="text-secondary-300">|</span>
                              <span className={cn("font-bold", isWarning ? "text-error-600" : "text-primary-600")}>
                                {hours} hrs
                              </span>
                            </p>
                            {perm.reason && (
                              <p className="text-sm text-secondary-700 dark:text-surface-300 bg-surface-50 dark:bg-surface-800/50 p-2 rounded-lg italic">"{perm.reason}"</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* CALENDAR TAB */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">

              {/* Monthly Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-4 bg-surface-50 dark:bg-surface-800/50 border-l-4 border-l-primary-500">
                  <p className="text-sm text-secondary-600 dark:text-surface-400">Leaves This Month (Appr)</p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">{monthlyStats.leavesCount}</p>
                </div>
                <div className="card p-4 bg-surface-50 dark:bg-surface-800/50 border-l-4 border-l-success-500">
                  <p className="text-sm text-secondary-600 dark:text-surface-400">Perms This Month (Appr)</p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">{monthlyStats.permissionsCount}</p>
                </div>
                <div className="card p-4 bg-surface-50 dark:bg-surface-800/50 border-l-4 border-l-error-500">
                  <p className="text-sm text-secondary-600 dark:text-surface-400">Perm Hours This Month</p>
                  <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">{monthlyStats.permissionHours.toFixed(2)}</p>
                </div>
              </div>

              {/* Calendar Component */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-secondary-900 dark:text-white">
                    {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </h2>
                  <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
                      <ChevronLeft className="w-5 h-5 text-secondary-600" />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors">
                      <ChevronRight className="w-5 h-5 text-secondary-600" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-surface-200 dark:bg-surface-700 rounded-lg overflow-hidden">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-surface-50 dark:bg-surface-800/50 py-2 text-center text-xs font-semibold text-secondary-500">
                      {day}
                    </div>
                  ))}

                  {calendarDays.map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} className="bg-white dark:bg-surface-900 p-2 min-h-[100px]" />;

                    const { leaves, perms } = getDayEvents(date);
                    const isToday = date.toDateString() === new Date().toDateString();

                    return (
                      <div key={date.toISOString()} className={cn("bg-white dark:bg-surface-900 p-2 min-h-[100px] border-t border-surface-100 dark:border-surface-800 transition-colors", isToday && "bg-primary-50/30 dark:bg-primary-900/10")}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={cn("text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full", isToday ? "bg-primary-600 text-white" : "text-secondary-700 dark:text-surface-300")}>
                            {date.getDate()}
                          </span>
                        </div>

                        <div className="space-y-1">
                          {leaves.map((l, idx) => (
                            <div key={`l-${idx}`} title={isLmsAdmin ? `${getEmployeeName(l.userId)} — ${l.leaveType}` : l.leaveType} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-700 truncate cursor-help">
                              {l.leaveType} {(l.status || '').toLowerCase() === 'approved' ? '✓' : ''}
                            </div>
                          ))}
                          {perms.map((p, idx) => (
                            <div key={`p-${idx}`} title={isLmsAdmin ? `${getEmployeeName(p.userId)} — ${p.permissionType} (${p.totalHours}h)` : `${p.permissionType} (${p.totalHours}h)`} className="text-[10px] px-1.5 py-0.5 rounded bg-success-100 text-success-700 truncate cursor-help">
                              {p.totalHours}h {(p.status || '').toLowerCase() === 'approved' ? '✓' : ''}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 mt-4 text-xs text-secondary-500 justify-end">
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-primary-100"></div> Leave</div>
                  <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success-100"></div> Permission</div>
                  <div>✓ = Approved</div>
                </div>

              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function LeaveBalanceCard({ type, balance, icon: Icon, color }: { type: string; balance: number; icon: React.ElementType; color: string }) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-2.5">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
          color === 'primary' ? 'bg-primary-100 text-primary-600' : '',
          color === 'error' ? 'bg-error-100 text-error-600' : ''
        )}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div>
          <p className="text-xs font-medium text-secondary-600 dark:text-surface-400 mb-0.5">{type}</p>
          <p className="text-lg font-bold text-secondary-900 dark:text-white">
            {balance} <span className="text-xs font-normal text-secondary-500">days</span>
          </p>
        </div>
      </div>
    </div>
  );
}