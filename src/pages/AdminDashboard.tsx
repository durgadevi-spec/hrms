import { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Users, FolderKanban, Clock, CalendarX, AlertTriangle,
  Search, Calendar, ChevronRight, User, Mail, Phone, ShieldAlert,
  CheckCircle2, Briefcase, Clock4, FileText, X, Activity, GraduationCap,
  LayoutDashboard, ArrowLeft
} from 'lucide-react';
import { formatDate, cn } from '../utils/formatters';

// ─── NEW ENHANCED ADMIN VIEW ────────────────────────────────────────────────
function AdminDashboardView() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leavesData, setLeavesData] = useState<any>({ balances: [], history: [], permissions: [], lmsUsers: [] });
  const [timesheets, setTimesheets] = useState<any>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectAssignments, setProjectAssignments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  // const [syncSummary, setSyncSummary] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);

  // Selected Employee Details Tabs
  const [detailTab, setDetailTab] = useState<'profile' | 'leaves' | 'projects' | 'timesheets' | 'activity'>('profile');

  // Sidebar / List Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');

  // Detail View Sub-Filters
  const [leavesFilter, setLeavesFilter] = useState('all');
  const [timesheetStatusFilter, setTimesheetStatusFilter] = useState('all');
  const [timesheetProjectFilter, setTimesheetProjectFilter] = useState('all');
  const [timesheetMonth, setTimesheetMonth] = useState<number>(new Date().getMonth());
  const [timesheetYear, setTimesheetYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setIsLoading(true);
        const [emp, depts, leaves, ts, prj, asgn, tsk, syncData] = await Promise.all([
          api.get('/api/employees'),
          api.get('/api/departments'),
          api.get('/api/leave-requests'),
          api.get('/api/timesheets?scope=org'),
          api.get('/api/projects'),
          api.get('/api/projects/assignments/all'),
          api.get('/api/tasks'),
          api.get('/api/admin/employee-sync').catch(() => ({ employees: [], summary: null }))
        ]);

        // Merge sync flags into employees list
        const syncMap: Record<string, { inLms: boolean; inPms: boolean }> = {};
        (syncData.employees || []).forEach((s: any) => {
          syncMap[s.id] = { inLms: s.inLms, inPms: s.inPms };
        });
        const enrichedEmps = emp.map((e: any) => ({
          ...e,
          inLms: syncMap[e.id]?.inLms ?? false,
          inPms: syncMap[e.id]?.inPms ?? false,
        }));

        setEmployees(enrichedEmps);
        setDepartments(depts);
        setLeavesData(leaves);
        setTimesheets(ts);
        setProjects(prj);
        setProjectAssignments(asgn);
        setTasks(tsk);
        // setSyncSummary(syncData.summary || null);
      } catch (err) {
        console.error('Failed to load admin dashboard data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const todayStr = selectedDate;

  // Helper mappings
  const getEmployeeFromLmsUserId = (lmsUserId: string) => {
    const lmsUser = (leavesData.lmsUsers || []).find((u: any) => u.userId === lmsUserId);
    if (!lmsUser || !lmsUser.email) return null;
    return employees.find((e: any) => e.email && e.email.toLowerCase().trim() === lmsUser.email.toLowerCase().trim());
  };

  const getLmsUserIdFromEmployee = (emp: any) => {
    if (!emp || !emp.email) return null;
    const lmsUser = (leavesData.lmsUsers || []).find((u: any) => u.email && u.email.toLowerCase().trim() === emp.email.toLowerCase().trim());
    return lmsUser?.userId || null;
  };

  const getTsUserIdFromEmployee = (emp: any) => {
    if (!emp || !emp.email) return null;
    const tsUsers = Array.isArray(timesheets) ? [] : (timesheets?.employees || []);
    const tsUser = tsUsers.find((u: any) => u.email && u.email.toLowerCase().trim() === emp.email.toLowerCase().trim());
    return tsUser?.id || null;
  };

  // 1. Overall Statistics Calculations
  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => (e.status || '').toLowerCase() === 'active');

    // On Leave Today: unique employees with approved leave request covering today
    const leavesToday = (leavesData.history || []).filter((l: any) => {
      const isApproved = (l.status || '').toLowerCase() === 'approved';
      if (!isApproved) return false;
      const start = l.startDate ? l.startDate.split('T')[0] : '';
      const end = l.endDate ? l.endDate.split('T')[0] : '';
      return start <= todayStr && end >= todayStr;
    });

    const uniqueLmsUsersOnLeaveToday = new Set<string>(leavesToday.map((l: any) => l.userId as string));
    const employeesOnLeaveTodayCount = Array.from(uniqueLmsUsersOnLeaveToday)
      .map(id => getEmployeeFromLmsUserId(id))
      .filter(Boolean)
      .filter((e: any) => (e.status || '').toLowerCase() === 'active').length;

    // Pending Leave Requests Count
    const pendingLeaves = (leavesData.history || []).filter((l: any) => (l.status || '').toLowerCase() === 'pending');
    const uniquePendingEmployees = new Set(
      pendingLeaves.map((l: any) => getEmployeeFromLmsUserId(l.userId)).filter(Boolean).map((e: any) => e.id)
    );

    // Submitted Timesheet Today
    const tsArray = Array.isArray(timesheets) ? timesheets : (timesheets?.timeEntries || []);
    const submittedToday = tsArray.filter((t: any) => {
      const tsDate = t.date ? t.date.split('T')[0] : '';
      return tsDate === todayStr && ['draft', 'pending', 'submitted', 'approved', 'manager_approved'].includes(t.status);
    });
    const uniqueSubmittedToday = new Set(submittedToday.map((t: any) => t.employeeId));
    const submittedTodayCount = activeEmployees.filter(e => {
      const tsUserId = getTsUserIdFromEmployee(e);
      return tsUserId && uniqueSubmittedToday.has(tsUserId);
    }).length;
    const notSubmittedTodayCount = Math.max(0, activeEmployees.length - submittedTodayCount);

    // Overdue Tasks: employees with at least one overdue task
    const overdueTasks = tasks.filter((t: any) => {
      const isPending = t.status !== 'completed';
      const isPast = t.dueDate ? t.dueDate.split('T')[0] < todayStr : false;
      return isPending && isPast;
    });
    const uniqueOverdueEmployees = new Set(overdueTasks.map((t: any) => t.assignedTo).filter(Boolean));

    // Active Projects: unique employees assigned to active/delayed projects
    const activeProjectIds = new Set(projects.filter(p => ['active', 'delayed'].includes(p.status)).map(p => p.id));
    const uniqueActiveProjEmployees = new Set(
      projectAssignments.filter(pa => activeProjectIds.has(pa.projectId)).map((pa: any) => pa.employeeId).filter(Boolean)
    );

    return {
      totalEmployees: employees.length,
      activeEmployees: activeEmployees.length,
      onLeaveToday: employeesOnLeaveTodayCount,
      pendingLeaves: uniquePendingEmployees.size,
      submittedToday: submittedTodayCount,
      notSubmittedToday: notSubmittedTodayCount,
      overdueTasks: uniqueOverdueEmployees.size,
      activeProjects: uniqueActiveProjEmployees.size
    };
  }, [employees, leavesData, timesheets, tasks, projects, projectAssignments, todayStr]);

  // Unique designations for filter dropdown
  const designations = useMemo(() => {
    const list = employees.map(e => e.designation).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [employees]);

  // 2. Filtered Employee List
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        (e.firstName || '').toLowerCase().includes(query) ||
        (e.lastName || '').toLowerCase().includes(query) ||
        (e.employeeId || '').toLowerCase().includes(query) ||
        (e.designation || '').toLowerCase().includes(query) ||
        (e.department?.name || '').toLowerCase().includes(query);

      const matchesDept = deptFilter === 'all' || e.departmentId === deptFilter;
      const matchesDesg = designationFilter === 'all' || e.designation === designationFilter;

      return matchesSearch && matchesDept && matchesDesg;
    });
  }, [employees, searchQuery, deptFilter, designationFilter]);

  // 3. Selected Employee Specific Data & Metrics
  const selectedEmployeeData = useMemo(() => {
    if (!selectedEmp) return null;
    const empId = selectedEmp.id;
    const lmsUserId = getLmsUserIdFromEmployee(selectedEmp);

    // Profile Details
    const dept = departments.find(d => d.id === selectedEmp.departmentId);
    const mgr = employees.find(e => e.id === selectedEmp.reportingManagerId);

    // Leaves (LMS)
    const empBalances = lmsUserId
      ? leavesData.balances.find((b: any) => b.employeeCode === lmsUserId)
      : null;
    const empLeaves = lmsUserId
      ? leavesData.history.filter((h: any) => h.userId === lmsUserId)
      : [];
    const empPermissions = lmsUserId
      ? leavesData.permissions.filter((p: any) => p.userId === lmsUserId)
      : [];

    const leavesStats = {
      pending: empLeaves.filter((l: any) => (l.status || '').toLowerCase() === 'pending').length,
      approved: empLeaves.filter((l: any) => (l.status || '').toLowerCase() === 'approved').length,
      rejected: empLeaves.filter((l: any) => (l.status || '').toLowerCase() === 'rejected').length,
      permissionsCount: empPermissions.filter((p: any) => (p.status || '').toLowerCase() === 'approved').length
    };

    // Projects (PMS)
    const empAssignments = projectAssignments.filter(pa => pa.employeeId === empId);
    const empProjects = empAssignments
      .map(pa => projects.find(p => p.id === pa.projectId))
      .filter(Boolean);
    const empTasks = tasks.filter(t => t.assignedTo === empId);

    const projectsStats = {
      assigned: empProjects.length,
      active: empProjects.filter(p => ['active', 'delayed'].includes(p.status)).length,
      tasksCount: empTasks.length,
      completedTasks: empTasks.filter(t => t.status === 'completed').length,
      overdueTasks: empTasks.filter(t => {
        const isPending = t.status !== 'completed';
        const isPast = t.dueDate ? t.dueDate.split('T')[0] < todayStr : false;
        return isPending && isPast;
      }).length,
      upcomingTasks: empTasks.filter(t => {
        const isPending = t.status !== 'completed';
        const isFuture = t.dueDate ? t.dueDate.split('T')[0] >= todayStr : false;
        return isPending && isFuture;
      }).length
    };

    // Timesheets (TimeStrap)
    const tsUserId = getTsUserIdFromEmployee(selectedEmp);
    const tsArray2 = Array.isArray(timesheets) ? timesheets : (timesheets?.timeEntries || []);
    const empTimesheets = tsUserId ? tsArray2.filter((t: any) => t.employeeId === tsUserId) : [];

    // Filters applied to timesheet entries list
    const empTimesheetsFiltered = empTimesheets.filter((t: any) => {
      const tDate = new Date(t.date);
      const matchesMonth = tDate.getMonth() === timesheetMonth;
      const matchesYear = tDate.getFullYear() === timesheetYear;
      const matchesStatus = timesheetStatusFilter === 'all' || t.status === timesheetStatusFilter;
      const matchesProject = timesheetProjectFilter === 'all' || t.projectId === timesheetProjectFilter;
      return matchesMonth && matchesYear && matchesStatus && matchesProject;
    });

    // TimeStrap stats for selected month/year
    const empTimesheetsForMonth = empTimesheets.filter((t: any) => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === timesheetMonth && tDate.getFullYear() === timesheetYear;
    });

    const timesheetStats = {
      totalHours: empTimesheetsForMonth.reduce((acc: any, t: any) => acc + parseFloat(t.hoursWorked || 0), 0),
      entriesCount: empTimesheetsForMonth.length,
      submitted: empTimesheetsForMonth.filter((t: any) => t.status === 'submitted').length,
      approved: empTimesheetsForMonth.filter((t: any) => t.status === 'approved').length,
      rejected: empTimesheetsForMonth.filter((t: any) => t.status === 'rejected').length
    };

    // Calculate business days in selected month up to today
    const getBusinessDays = (m: number, y: number) => {
      const dates = [];
      const startDate = new Date(y, m, 1);
      const todayDate = new Date();
      const lastDay = new Date(y, m + 1, 0);
      const limit = (todayDate.getFullYear() === y && todayDate.getMonth() === m) ? todayDate : lastDay;

      const current = new Date(startDate);
      while (current <= limit) {
        const dow = current.getDay();
        if (dow !== 0 && dow !== 6) { // Mon-Fri
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    const businessDays = getBusinessDays(timesheetMonth, timesheetYear);
    const loggedDates = new Set(empTimesheetsForMonth.map((t: any) => {
      const dateVal = new Date(t.date);
      return dateVal.toISOString().split('T')[0];
    }));

    const missingDates = businessDays
      .map(d => d.toISOString().split('T')[0])
      .filter(dateStr => !loggedDates.has(dateStr));

    // Attendance stats
    const submissionRate = businessDays.length > 0
      ? Math.round(((businessDays.length - missingDates.length) / businessDays.length) * 100)
      : 100;
    const avgDailyHours = empTimesheetsForMonth.length > 0
      ? (timesheetStats.totalHours / empTimesheetsForMonth.length).toFixed(1)
      : '0.0';

    // Recent Activities Feed (Merged leaves, timesheets, and tasks)
    const recentActivities = [
      ...empLeaves.slice(0, 5).map((l: any) => ({
        id: `leave_${l.id}`,
        type: 'leave',
        title: `${l.leaveType.replace('_', ' ')} Request`,
        desc: `${l.status} leave: ${formatDate(l.startDate)} to ${formatDate(l.endDate)}`,
        date: l.createdAt || l.startDate,
        status: l.status
      })),
      ...empTimesheets.slice(0, 5).map((t: any) => ({
        id: `ts_${t.id}`,
        type: 'timesheet',
        title: `Time Logged`,
        desc: `${t.hoursWorked}h on ${formatDate(t.date)} (${t.status})`,
        date: t.submittedAt || t.date,
        status: t.status
      })),
      ...empTasks.slice(0, 5).map((tsk: any) => ({
        id: `task_${tsk.id}`,
        type: 'task',
        title: `Task Assignment`,
        desc: `Assigned: "${tsk.title}" (Status: ${tsk.status})`,
        date: tsk.createdAt,
        status: tsk.status
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    return {
      department: dept,
      manager: mgr,
      balances: empBalances,
      leaves: empLeaves,
      leavesFiltered: empLeaves.filter((l: any) => leavesFilter === 'all' || (l.status || '').toLowerCase() === leavesFilter.toLowerCase()),
      permissions: empPermissions,
      leavesStats,
      projects: empProjects,
      tasks: empTasks,
      projectsStats,
      timesheetsAll: empTimesheets,
      timesheetsFiltered: empTimesheetsFiltered,
      timesheetStats,
      missingDates,
      submissionRate,
      avgDailyHours,
      recentActivities
    };
  }, [selectedEmp, departments, employees, leavesData, projectAssignments, projects, tasks, timesheets, todayStr, leavesFilter, timesheetStatusFilter, timesheetProjectFilter, timesheetMonth, timesheetYear]);

  // Handle Month/Year change helpers
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Helper: check if an employee is on approved leave today
  const isOnLeaveToday = (emp: any) => {
    const empLmsId = getLmsUserIdFromEmployee(emp);
    if (!empLmsId) return false;
    return (leavesData.history || []).some((l: any) => {
      const isApproved = (l.status || '').toLowerCase() === 'approved';
      if (!isApproved || l.userId !== empLmsId) return false;
      const start = l.startDate ? new Date(l.startDate).toLocaleDateString('en-CA') : '';
      const end = l.endDate ? new Date(l.endDate).toLocaleDateString('en-CA') : '';
      return start <= todayStr && end >= todayStr;
    });
  };

  // Helper: check if an employee has a pending leave request
  const hasPendingLeaveRequest = (emp: any) => {
    const empLmsId = getLmsUserIdFromEmployee(emp);
    if (!empLmsId) return false;
    return (leavesData.history || []).some(
      (l: any) => l.userId === empLmsId && (l.status || '').toLowerCase() === 'pending'
    );
  };

  // Helper: get employee's active project count
  const getActiveProjectCount = (emp: any) => {
    const activeProjectIds = new Set(projects.filter(p => ['active', 'delayed'].includes(p.status)).map(p => p.id));
    return projectAssignments.filter(pa => pa.employeeId === emp.id && activeProjectIds.has(pa.projectId)).length;
  };

  // Helper: check if employee submitted timesheet today
  const hasSubmittedTimesheetToday = (emp: any) => {
    const tsUserId = getTsUserIdFromEmployee(emp);
    if (!tsUserId) return false;
    const tsArray = Array.isArray(timesheets) ? timesheets : (timesheets?.timeEntries || []);
    return tsArray.some((t: any) => {
      const tsDate = t.date ? t.date.split('T')[0] : '';
      return t.employeeId === tsUserId && tsDate === todayStr && ['draft', 'pending', 'submitted', 'approved', 'manager_approved'].includes(t.status);
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-200 dark:border-surface-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 dark:text-white tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-primary-600" />
            Admin Centralized Dashboard
          </h1>
          <p className="text-secondary-500 dark:text-surface-400 mt-1">
            Centralized monitoring of leave balances, project statuses, and employee timesheets.
          </p>
        </div>
        <div className="text-sm font-semibold text-secondary-500 dark:text-surface-400 bg-white dark:bg-surface-900 border px-4 py-1.5 rounded-xl flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none outline-none cursor-pointer text-secondary-900 dark:text-white"
          />
        </div>
      </div>

      {/* ── Dashboard Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {[
          { label: 'Total Employees', value: stats.totalEmployees, sub: `${stats.activeEmployees} active`, icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/10' },
          { label: 'On Leave Today', value: stats.onLeaveToday, sub: 'employees', icon: CalendarX, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/10' },
          { label: 'Pending Leaves', value: stats.pendingLeaves, sub: 'needs approval', icon: Clock, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/10' },
          { label: 'Submitted Today', value: stats.submittedToday, sub: 'timesheets', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10' },
          { label: 'Not Submitted', value: stats.notSubmittedToday, sub: 'outstanding', icon: X, color: 'text-gray-600 bg-gray-50 dark:bg-surface-800' },
          { label: 'Overdue Tasks', value: stats.overdueTasks, sub: 'items delayed', icon: AlertTriangle, color: 'text-red-600 bg-red-50 dark:bg-red-900/10' },
          { label: 'Active Projects', value: stats.activeProjects, sub: 'engaged team', icon: FolderKanban, color: 'text-primary-600 bg-primary-50 dark:bg-primary-900/10' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-surface-900 rounded-2xl p-4 border border-surface-100 dark:border-surface-800 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <div className={cn('p-2.5 rounded-xl shrink-0', item.color)}>
                <item.icon className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white leading-none mb-1">{item.value}</p>
              <p className="text-xs font-semibold text-secondary-700 dark:text-surface-300 line-clamp-1">{item.label}</p>
              <p className="text-[10px] text-secondary-400 mt-0.5">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Workspace ── */}
      {!selectedEmp ? (
        /* ── Full-Page Employee Grid (No employee selected) ── */
        <div className="space-y-5">
          {/* Search & Filters Bar */}
          <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm p-4">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
              {/* Search */}
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-secondary-400" />
                  <input
                    type="text"
                    placeholder="Search Name, ID, Desg, Dept..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-10 py-2.5 w-full"
                  />
                </div>
              </div>
              {/* Filters */}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-secondary-500 mb-1">Department</label>
                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="input-field py-1.5 px-2 bg-surface-50 dark:bg-surface-800 text-xs text-secondary-950 dark:text-white"
                  >
                    <option value="all">All Depts</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-secondary-500 mb-1">Designation</label>
                  <select
                    value={designationFilter}
                    onChange={(e) => setDesignationFilter(e.target.value)}
                    className="input-field py-1.5 px-2 bg-surface-50 dark:bg-surface-800 text-xs text-secondary-950 dark:text-white"
                  >
                    <option value="all">All Desgs</option>
                    {designations.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Header Count */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-secondary-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              Employees ({filteredEmployees.length})
            </h2>
          </div>

          {/* Employee Cards Grid */}
          {filteredEmployees.length === 0 ? (
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm py-16 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-secondary-300 opacity-50" />
              <p className="text-sm text-secondary-400">No employees match filters</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 dark:border-surface-800 text-xs uppercase text-secondary-500 font-semibold">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4">Department / Desg</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Leave / Timesheet</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                    {filteredEmployees.map((emp) => {
                      const onLeave = isOnLeaveToday(emp);
                      const pendingLeave = hasPendingLeaveRequest(emp);
                      const activeProjects = getActiveProjectCount(emp);
                      const submittedTS = hasSubmittedTimesheetToday(emp);
                      const empStatus = emp.status?.toLowerCase() || 'active';

                      return (
                        <tr key={emp.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center shrink-0 shadow-sm text-white overflow-hidden',
                                empStatus === 'inactive' ? 'bg-secondary-300 text-secondary-600' : 'bg-gradient-to-br from-primary-400 to-accent-500'
                              )}>
                                {emp.profilePicture ? (
                                  <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <>{emp.firstName.charAt(0)}{emp.lastName.charAt(0)}</>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-secondary-900 dark:text-white">
                                  {emp.firstName} {emp.lastName}
                                </p>
                                <p className="text-xs text-secondary-500">{emp.employeeId}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-secondary-900 dark:text-white">{emp.department?.name || 'N/A'}</p>
                            <p className="text-xs text-secondary-500">{emp.designation || 'N/A'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <span className={cn('w-2 h-2 rounded-full',
                                empStatus === 'active' ? 'bg-success-500' :
                                  (empStatus === 'on_leave' || empStatus === 'on leave') ? 'bg-warning-500' : 'bg-secondary-400'
                              )} />
                              <span className={cn('badge capitalize',
                                empStatus === 'active' ? 'badge-success' :
                                  (empStatus === 'on_leave' || empStatus === 'on leave') ? 'badge-warning' : 'badge-error'
                              )}>
                                {emp.status?.replace('_', ' ') || 'Active'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              {onLeave ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                                  🏖 On Leave
                                </span>
                              ) : pendingLeave ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 animate-pulse">
                                  ⏳ Pending Leave
                                </span>
                              ) : null}
                              {submittedTS ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                  ✓ TS Logged
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-100 text-secondary-500 dark:bg-surface-800 dark:text-surface-400">
                                  ✗ No TS
                                </span>
                              )}
                              {activeProjects > 0 && (
                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                  {activeProjects} Project{activeProjects > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => { setSelectedEmp(emp); setDetailTab('profile'); }}
                              className="text-sm text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1"
                            >
                              View <ChevronRight className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Employee Selected: Sidebar + Detail View ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left Side: Employee List Sidebar */}
          <div className="lg:col-span-1 bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm p-4 space-y-4">
            {/* Back button */}
            <button
              onClick={() => setSelectedEmp(null)}
              className="flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors mb-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to All Employees
            </button>

            <div className="flex items-center justify-between border-b border-surface-100 dark:border-surface-800 pb-3">
              <h2 className="font-bold text-lg text-secondary-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                Employees ({filteredEmployees.length})
              </h2>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-secondary-400" />
              <input
                type="text"
                placeholder="Search Name, ID, Desg, Dept..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 py-2.5"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block font-semibold text-secondary-500 mb-1">Department</label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="input-field py-1.5 px-2 bg-surface-50 dark:bg-surface-800 text-xs text-secondary-950 dark:text-white"
                >
                  <option value="all">All Depts</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-secondary-500 mb-1">Designation</label>
                <select
                  value={designationFilter}
                  onChange={(e) => setDesignationFilter(e.target.value)}
                  className="input-field py-1.5 px-2 bg-surface-50 dark:bg-surface-800 text-xs text-secondary-950 dark:text-white"
                >
                  <option value="all">All Desgs</option>
                  {designations.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee list container */}
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {filteredEmployees.length === 0 ? (
                <div className="py-12 text-center text-secondary-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No employees match filters</p>
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmp?.id === emp.id;
                  const onLeave = isOnLeaveToday(emp);
                  const pendingLeave = hasPendingLeaveRequest(emp);

                  return (
                    <button
                      key={emp.id}
                      onClick={() => { setSelectedEmp(emp); setDetailTab('profile'); }}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group',
                        isSelected
                          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20'
                          : 'border-surface-100 dark:border-surface-800 hover:border-secondary-300 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/30'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-white font-bold flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                          {emp.profilePicture ? (
                            <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <>{emp.firstName.charAt(0)}{emp.lastName.charAt(0)}</>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-xs text-secondary-500 truncate mt-0.5">
                            {emp.designation} · {emp.department?.name || 'No Dept'}
                          </p>
                          {/* Status badges */}
                          <div className="flex items-center gap-1 mt-1">
                            {onLeave ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                                On Leave
                              </span>
                            ) : pendingLeave ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 animate-pulse">
                                Pending Leave
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn('w-2 h-2 rounded-full', (emp.status || '').toLowerCase() === 'active' ? 'bg-success-500' : 'bg-rose-400')} />
                        <ChevronRight className="w-4 h-4 text-secondary-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Side: Selected Employee Console Workspace */}
          <div className="lg:col-span-2 space-y-6">
            {/* Detail panel - always shown when employee is selected */}
            {(
              <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden min-h-[580px] flex flex-col">

                {/* Employee Quick Info Header */}
                <div className="p-6 bg-surface-50 dark:bg-surface-800/40 border-b border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                      {selectedEmp.profilePicture ? (
                        <img src={selectedEmp.profilePicture} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>{selectedEmp.firstName.charAt(0)}{selectedEmp.lastName.charAt(0)}</>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
                        {selectedEmp.firstName} {selectedEmp.lastName}
                        <span className={cn('badge text-[10px]', (selectedEmp.status || '').toLowerCase() === 'active' ? 'badge-success' : 'badge-error')}>
                          {selectedEmp.status}
                        </span>
                      </h2>
                      <p className="text-sm text-secondary-600 dark:text-surface-300 mt-0.5">
                        {selectedEmp.designation} · {selectedEmployeeData?.department?.name || 'No Department'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-white dark:bg-surface-950 border px-3 py-1.5 rounded-lg text-xs font-semibold text-secondary-500">
                      <Briefcase className="w-3.5 h-3.5" /> ID: {selectedEmp.employeeId}
                    </div>
                    <span className={cn(
                      'text-xs font-bold px-2.5 py-1.5 rounded-lg border',
                      selectedEmp.inLms
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-surface-50 text-secondary-400 border-surface-200 dark:bg-surface-800 dark:text-surface-500'
                    )}>
                      {selectedEmp.inLms ? '✓' : '✗'} LMS
                    </span>
                    <span className={cn(
                      'text-xs font-bold px-2.5 py-1.5 rounded-lg border',
                      selectedEmp.inPms
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-surface-50 text-secondary-400 border-surface-200 dark:bg-surface-800 dark:text-surface-500'
                    )}>
                      {selectedEmp.inPms ? '✓' : '✗'} PMS
                    </span>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex border-b border-surface-200 dark:border-surface-800 overflow-x-auto bg-surface-50/20 dark:bg-surface-900">
                  {[
                    { id: 'profile', label: 'Profile View', icon: User },
                    { id: 'leaves', label: 'LMS Leaves', icon: FileText },
                    { id: 'projects', label: 'PMS Projects', icon: FolderKanban },
                    { id: 'timesheets', label: 'TimeStrap', icon: Clock4 },
                    { id: 'activity', label: 'Activity & Stats', icon: Activity }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetailTab(tab.id as any)}
                      className={cn(
                        'px-5 py-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap outline-none',
                        detailTab === tab.id
                          ? 'border-primary-600 text-primary-600 dark:text-primary-400 bg-white dark:bg-surface-900'
                          : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:hover:text-surface-300'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Console Body Area */}
                <div className="p-6 flex-1 overflow-y-auto">

                  {/* ─── TAB 1: Profile ─── */}
                  {detailTab === 'profile' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-100 dark:border-surface-800">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400">Email Address</p>
                          <p className="text-sm font-semibold text-secondary-900 dark:text-white mt-1 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-primary-500" /> {selectedEmp.email}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-100 dark:border-surface-800">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400">Phone Number</p>
                          <p className="text-sm font-semibold text-secondary-900 dark:text-white mt-1 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-primary-500" /> {selectedEmp.mobileNumber || '—'}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-100 dark:border-surface-800">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400">Reporting Manager</p>
                          <p className="text-sm font-semibold text-secondary-900 dark:text-white mt-1 flex items-center gap-2">
                            <User className="w-4 h-4 text-primary-500" />
                            {selectedEmployeeData?.manager ? `${selectedEmployeeData.manager.firstName} ${selectedEmployeeData.manager.lastName}` : 'None Assigned'}
                          </p>
                        </div>
                        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-100 dark:border-surface-800">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400">Date of Joining</p>
                          <p className="text-sm font-semibold text-secondary-900 dark:text-white mt-1 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary-500" /> {formatDate(selectedEmp.joiningDate)}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-100 dark:border-surface-800">
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400 mb-2">Short Biography</p>
                        <p className="text-sm text-secondary-700 dark:text-surface-300 leading-relaxed italic">
                          "{selectedEmp.bio || 'No biography written for this employee.'}"
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Skills */}
                        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-100 dark:border-surface-800">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400 mb-2">Key Skills</p>
                          {selectedEmp.skills && selectedEmp.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedEmp.skills.map((s: string) => (
                                <span key={s} className="px-2 py-0.5 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 text-[11px] font-semibold rounded-full border border-primary-200 dark:border-primary-800">
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-secondary-400">No skills registered</p>
                          )}
                        </div>

                        {/* Personal Details */}
                        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-100 dark:border-surface-800 space-y-2 text-xs">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400 mb-2">Personal info</p>
                          <div className="flex justify-between">
                            <span className="text-secondary-400">Date of Birth:</span>
                            <span className="font-semibold text-secondary-900 dark:text-white">{selectedEmp.dateOfBirth ? formatDate(selectedEmp.dateOfBirth) : '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-secondary-400">Blood Group:</span>
                            <span className="font-semibold text-secondary-900 dark:text-white">{selectedEmp.bloodGroup || '—'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-secondary-400">Nationality:</span>
                            <span className="font-semibold text-secondary-900 dark:text-white">{selectedEmp.nationality || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Education */}
                      {selectedEmp.education && selectedEmp.education.length > 0 && (
                        <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-100 dark:border-surface-800">
                          <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400 mb-3 flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4" /> Education History
                          </p>
                          <div className="space-y-3">
                            {selectedEmp.education.map((edu: any, i: number) => (
                              <div key={i} className="flex justify-between text-xs items-start">
                                <div>
                                  <p className="font-semibold text-secondary-900 dark:text-white">{edu.degree}</p>
                                  <p className="text-secondary-500 mt-0.5">{edu.institution}</p>
                                </div>
                                <span className="text-[10px] bg-secondary-100 dark:bg-surface-850 px-2 py-0.5 rounded-full text-secondary-600 font-medium">
                                  {edu.year}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Emergency Contact */}
                      {selectedEmp.emergencyContact && (
                        <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950 flex items-start gap-3">
                          <ShieldAlert className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                          <div className="text-xs">
                            <p className="font-bold text-rose-800 dark:text-rose-400">Emergency Contact</p>
                            <p className="font-semibold text-secondary-900 dark:text-white mt-1">
                              {selectedEmp.emergencyContact.name} ({selectedEmp.emergencyContact.relationship})
                            </p>
                            <p className="text-secondary-500 mt-0.5">Phone: {selectedEmp.emergencyContact.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── TAB 2: Leaves (LMS) ─── */}
                  {detailTab === 'leaves' && (
                    <div className="space-y-6">
                      {/* Balance Cards */}
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400 mb-2">Leave Balances</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="p-4 rounded-xl bg-blue-50/40 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-950">
                            <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">Casual Leave (CL)</p>
                            <p className="text-2xl font-black text-blue-900 dark:text-blue-400 mt-1">
                              {selectedEmployeeData?.balances?.casualTotal - selectedEmployeeData?.balances?.casualUsed || 0}
                              <span className="text-xs font-normal text-blue-500 ml-1">/ {selectedEmployeeData?.balances?.casualTotal || 0}d left</span>
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-rose-50/40 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-950">
                            <p className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">Sick Leave (SL)</p>
                            <p className="text-2xl font-black text-rose-900 dark:text-rose-400 mt-1">
                              {selectedEmployeeData?.balances?.sickTotal - selectedEmployeeData?.balances?.sickUsed || 0}
                              <span className="text-xs font-normal text-rose-500 ml-1">/ {selectedEmployeeData?.balances?.sickTotal || 0}d left</span>
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-950">
                            <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">Earned Leave (EL)</p>
                            <p className="text-2xl font-black text-emerald-900 dark:text-emerald-400 mt-1">
                              {selectedEmp.paidLeaveBalance || 0}
                              <span className="text-xs font-normal text-emerald-500 ml-1">days balance</span>
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-purple-50/40 dark:bg-purple-900/10 border border-purple-100/50 dark:border-purple-950">
                            <p className="text-[10px] font-semibold text-purple-700 dark:text-purple-300">Permissions Used</p>
                            <p className="text-2xl font-black text-purple-900 dark:text-purple-400 mt-1">
                              {selectedEmployeeData?.leavesStats?.permissionsCount || 0}
                              <span className="text-xs font-normal text-purple-500 ml-1">approved</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Filter and Lists */}
                      <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                          <h4 className="font-bold text-sm text-secondary-900 dark:text-white">Leave History & Requests</h4>
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-secondary-400">Filter status:</span>
                            <select
                              value={leavesFilter}
                              onChange={(e) => setLeavesFilter(e.target.value)}
                              className="input-field py-1 px-2 text-xs bg-surface-50 dark:bg-surface-800 w-28"
                            >
                              <option value="all">All Leaves</option>
                              <option value="pending">Pending</option>
                              <option value="approved">Approved</option>
                              <option value="rejected">Rejected</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </div>

                        {/* Leaves list */}
                        <div className="space-y-2">
                          {selectedEmployeeData?.leavesFiltered.length === 0 ? (
                            <div className="py-6 text-center text-xs text-secondary-400 bg-surface-50 dark:bg-surface-800/10 rounded-xl">
                              No leave records found matching this status filter.
                            </div>
                          ) : (
                            selectedEmployeeData?.leavesFiltered.map((l: any, i: number) => {
                              const isPending = (l.status || '').toLowerCase() === 'pending';
                              const isApproved = (l.status || '').toLowerCase() === 'approved';
                              const isRejected = (l.status || '').toLowerCase() === 'rejected';

                              return (
                                <div key={i} className="p-3 bg-white dark:bg-surface-900 border border-surface-150 dark:border-surface-800 rounded-xl flex items-center justify-between text-xs gap-4 shadow-sm">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-secondary-800 dark:text-surface-200 capitalize">
                                        {l.leaveType.replace('_', ' ')}
                                      </span>
                                      <span className={cn('badge text-[9px] py-0.5 px-2 font-bold',
                                        isPending ? 'bg-amber-100 text-amber-700' :
                                          isApproved ? 'bg-emerald-100 text-emerald-700' :
                                            isRejected ? 'bg-rose-100 text-rose-700' : 'bg-secondary-100 text-secondary-700'
                                      )}>
                                        {l.status}
                                      </span>
                                    </div>
                                    <p className="text-secondary-500 mt-1">
                                      {formatDate(l.startDate)} {l.endDate && l.startDate !== l.endDate ? `to ${formatDate(l.endDate)}` : ''}
                                    </p>
                                    {l.reason && <p className="text-secondary-600 italic mt-0.5">"{l.reason}"</p>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Permissions list */}
                      <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
                        <h4 className="font-bold text-sm text-secondary-900 dark:text-white mb-3">Permission Logs</h4>
                        <div className="space-y-2">
                          {selectedEmployeeData?.permissions.length === 0 ? (
                            <div className="py-6 text-center text-xs text-secondary-400 bg-surface-50 dark:bg-surface-800/10 rounded-xl">
                              No permission records logged for this employee.
                            </div>
                          ) : (
                            selectedEmployeeData?.permissions.map((p: any, i: number) => {
                              const isApproved = (p.status || '').toLowerCase() === 'approved';
                              const hrs = parseFloat(p.totalHours || 0);

                              return (
                                <div key={i} className="p-3 bg-white dark:bg-surface-900 border border-surface-150 dark:border-surface-800 rounded-xl flex justify-between items-center text-xs shadow-sm">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-secondary-800 dark:text-surface-200 capitalize">
                                        {p.permissionType ? p.permissionType.replace('_', ' ') : 'Permission'}
                                      </span>
                                      <span className={cn('badge text-[9px]', isApproved ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary-100 text-secondary-700')}>
                                        {p.status}
                                      </span>
                                      {isApproved && hrs > 3 && (
                                        <span className="badge text-[9px] bg-red-100 text-red-700 font-bold border-transparent">
                                          Exceeds 3 Hours
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-secondary-500 mt-1">
                                      {formatDate(p.permissionDate)} · {p.fromTime} to {p.toTime} ({hrs} hrs)
                                    </p>
                                    {p.reason && <p className="text-secondary-500 italic mt-0.5">"{p.reason}"</p>}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── TAB 3: Projects (PMS) ─── */}
                  {detailTab === 'projects' && (
                    <div className="space-y-6">
                      {/* Projects Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { label: 'Assigned Projects', value: selectedEmployeeData?.projectsStats.assigned, color: 'text-blue-600 border-blue-100 bg-blue-50/20' },
                          { label: 'Active Projects', value: selectedEmployeeData?.projectsStats.active, color: 'text-primary-600 border-primary-100 bg-primary-50/20' },
                          { label: 'Completed Tasks', value: selectedEmployeeData?.projectsStats.completedTasks, sub: `out of ${selectedEmployeeData?.projectsStats.tasksCount} total`, color: 'text-emerald-600 border-emerald-100 bg-emerald-50/20' },
                          { label: 'Overdue Tasks', value: selectedEmployeeData?.projectsStats.overdueTasks, color: 'text-red-600 border-red-100 bg-red-50/20' }
                        ].map((item, idx) => (
                          <div key={idx} className={cn('p-4 border rounded-xl shadow-sm text-center', item.color)}>
                            <p className="text-2xl font-black leading-none">{item.value}</p>
                            <p className="text-xs font-semibold mt-1 opacity-90">{item.label}</p>
                            {(item as any).sub && <p className="text-[10px] opacity-70 mt-0.5">{(item as any).sub}</p>}
                          </div>
                        ))}
                      </div>

                      {/* Project Assignments */}
                      <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
                        <h4 className="font-bold text-sm text-secondary-900 dark:text-white mb-3">Assigned Projects</h4>
                        {selectedEmployeeData?.projects.length === 0 ? (
                          <div className="py-8 text-center text-xs text-secondary-400 bg-surface-50 dark:bg-surface-800/10 rounded-xl">
                            No projects currently assigned to this employee.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedEmployeeData?.projects.map((proj: any) => {
                              const isCompleted = proj.status === 'completed';
                              const isActive = proj.status === 'active';
                              const isDelayed = proj.status === 'delayed';

                              return (
                                <div key={proj.id} className="p-4 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl space-y-3 shadow-sm">
                                  <div className="flex justify-between items-start gap-2">
                                    <div>
                                      <h5 className="font-bold text-sm text-secondary-950 dark:text-white flex items-center gap-2">
                                        {proj.title}
                                        {proj.projectCode && (
                                          <span className="text-[10px] bg-secondary-100 dark:bg-surface-800 text-secondary-500 font-mono px-2 py-0.5 rounded">
                                            {proj.projectCode}
                                          </span>
                                        )}
                                      </h5>
                                      {proj.clientName && <p className="text-xs text-secondary-500 mt-0.5">{proj.clientName}</p>}
                                    </div>
                                    <span className={cn('badge text-[10px] font-bold capitalize',
                                      isCompleted ? 'bg-primary-100 text-primary-700' :
                                        isActive ? 'bg-emerald-100 text-emerald-700' :
                                          isDelayed ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                    )}>
                                      {proj.status}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-secondary-500 font-medium">
                                      <span>Progress</span>
                                      <span>{proj.progress}%</span>
                                    </div>
                                    <div className="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                                      <div
                                        className={cn('h-full transition-all duration-300 rounded-full',
                                          proj.progress >= 100 ? 'bg-emerald-500' :
                                            proj.progress >= 60 ? 'bg-primary-500' : 'bg-amber-500'
                                        )}
                                        style={{ width: `${proj.progress}%` }}
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-between text-[10px] text-secondary-400 pt-1">
                                    <span>Start: {formatDate(proj.startDate)}</span>
                                    <span>End: {proj.endDate ? formatDate(proj.endDate) : 'Ongoing'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Assigned Tasks list */}
                      <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
                        <h4 className="font-bold text-sm text-secondary-900 dark:text-white mb-3">Assigned Tasks</h4>
                        {selectedEmployeeData?.tasks.length === 0 ? (
                          <div className="py-8 text-center text-xs text-secondary-400 bg-surface-50 dark:bg-surface-800/10 rounded-xl">
                            No tasks assigned to this employee.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedEmployeeData?.tasks.map((task: any) => {
                              const isCompleted = task.status === 'completed';
                              const isOverdue = !isCompleted && task.dueDate && task.dueDate.split('T')[0] < todayStr;

                              return (
                                <div key={task.id} className="p-3 bg-white dark:bg-surface-900 border border-surface-150 dark:border-surface-800 rounded-xl flex items-center justify-between text-xs shadow-sm">
                                  <div className="min-w-0 flex-1 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={cn('font-semibold truncate', isCompleted ? 'text-secondary-400 line-through' : 'text-secondary-800 dark:text-surface-200')}>
                                        {task.title}
                                      </span>
                                      <span className={cn('badge text-[9px]',
                                        isCompleted ? 'bg-emerald-100 text-emerald-700' :
                                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                      )}>
                                        {task.status.replace('_', ' ')}
                                      </span>
                                      {isOverdue && (
                                        <span className="badge text-[9px] bg-red-100 text-red-700 font-black animate-pulse">
                                          Overdue
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-secondary-500 truncate">{task.description || 'No description'}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={cn('badge text-[9px] capitalize block',
                                      task.priority === 'urgent' || task.priority === 'high' ? 'bg-red-50 text-red-600' :
                                        task.priority === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                                    )}>
                                      {task.priority} Priority
                                    </span>
                                    <span className="text-[10px] text-secondary-400 block mt-1">
                                      Due: {task.dueDate ? formatDate(task.dueDate) : 'No date'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── TAB 4: TimeStrap (Timesheets) ─── */}
                  {detailTab === 'timesheets' && (
                    <div className="space-y-6">

                      {/* TimeStrap Filters Bar */}
                      <div className="flex flex-wrap gap-3 items-center justify-between p-4 bg-surface-50 dark:bg-surface-800/20 border border-surface-100 dark:border-surface-800 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <select
                            value={timesheetMonth}
                            onChange={(e) => setTimesheetMonth(parseInt(e.target.value))}
                            className="input-field py-1.5 px-3 text-xs bg-white dark:bg-surface-800 w-32"
                          >
                            {months.map((m, idx) => (
                              <option key={idx} value={idx}>{m}</option>
                            ))}
                          </select>
                          <select
                            value={timesheetYear}
                            onChange={(e) => setTimesheetYear(parseInt(e.target.value))}
                            className="input-field py-1.5 px-3 text-xs bg-white dark:bg-surface-800 w-24"
                          >
                            {years.map(y => (
                              <option key={y} value={y}>{y}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <select
                            value={timesheetStatusFilter}
                            onChange={(e) => setTimesheetStatusFilter(e.target.value)}
                            className="input-field py-1.5 px-2 bg-white dark:bg-surface-800 text-xs w-28"
                          >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="submitted">Submitted</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>

                          <select
                            value={timesheetProjectFilter}
                            onChange={(e) => setTimesheetProjectFilter(e.target.value)}
                            className="input-field py-1.5 px-2 bg-white dark:bg-surface-800 text-xs w-36"
                          >
                            <option value="all">All Projects</option>
                            {selectedEmployeeData?.projects.map((p: any) => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Monthly Summary Statistics */}
                      <div>
                        <p className="text-[11px] uppercase tracking-wider font-semibold text-secondary-400 mb-2">
                          Summary for {months[timesheetMonth]} {timesheetYear}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-150 dark:border-surface-800">
                            <p className="text-[10px] font-semibold text-secondary-400">Total Hours Logged</p>
                            <p className="text-2xl font-black text-secondary-900 dark:text-white mt-1">
                              {selectedEmployeeData?.timesheetStats.totalHours || 0}h
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-150 dark:border-surface-800">
                            <p className="text-[10px] font-semibold text-secondary-400">Total Submissions</p>
                            <p className="text-2xl font-black text-secondary-900 dark:text-white mt-1">
                              {selectedEmployeeData?.timesheetStats.entriesCount || 0}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-150 dark:border-surface-800">
                            <p className="text-[10px] font-semibold text-secondary-400">Approved Entries</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">
                              {selectedEmployeeData?.timesheetStats.approved || 0}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/30 border border-surface-150 dark:border-surface-800">
                            <p className="text-[10px] font-semibold text-secondary-400">Missing Submissions</p>
                            <p className="text-2xl font-black text-rose-600 mt-1">
                              {selectedEmployeeData?.missingDates.length || 0} days
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Time Entries list / Daily plans */}
                      <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
                        <h4 className="font-bold text-sm text-secondary-900 dark:text-white mb-3">Logged Time Entries (Daily Plans)</h4>
                        {selectedEmployeeData?.timesheetsFiltered.length === 0 ? (
                          <div className="py-8 text-center text-xs text-secondary-400 bg-surface-50 dark:bg-surface-800/10 rounded-xl">
                            No timesheet entries logged for this period.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {selectedEmployeeData?.timesheetsFiltered.map((ts: any) => {
                              const project = projects.find(p => p.id === ts.projectId);
                              const isApproved = ts.status === 'approved';
                              const isSubmitted = ts.status === 'submitted';

                              return (
                                <div key={ts.id} className="p-3 bg-white dark:bg-surface-900 border border-surface-150 dark:border-surface-800 rounded-xl flex items-center justify-between text-xs shadow-sm">
                                  <div className="min-w-0 flex-1 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold text-secondary-800 dark:text-surface-200">
                                        {formatDate(ts.date)}
                                      </span>
                                      <span className={cn('badge text-[9px] font-bold capitalize',
                                        isApproved ? 'bg-emerald-100 text-emerald-700' :
                                          isSubmitted ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                      )}>
                                        {ts.status}
                                      </span>
                                    </div>
                                    <p className="text-secondary-600 truncate">
                                      <span className="font-semibold text-secondary-700 dark:text-surface-300">[{project?.name || 'No Project'}]</span> {ts.taskDescription || 'No description logged'}
                                    </p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="font-black text-sm text-secondary-900 dark:text-white">{ts.hoursWorked}h</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Missing Timesheets list */}
                      <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
                        <h4 className="font-bold text-sm text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-500" /> Missing Submission Dates
                        </h4>
                        {selectedEmployeeData?.missingDates.length === 0 ? (
                          <div className="py-6 text-center text-xs text-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10 rounded-xl border border-emerald-100/50">
                            Great job! No missing timesheet submissions in this month.
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {selectedEmployeeData?.missingDates.map((dateStr: string) => (
                              <div key={dateStr} className="p-2 bg-rose-50/30 dark:bg-rose-950/5 border border-rose-100 dark:border-rose-950 rounded-lg text-center text-xs text-rose-700 dark:text-rose-400 font-semibold">
                                {formatDate(dateStr)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── TAB 5: Activity & Stats ─── */}
                  {detailTab === 'activity' && (
                    <div className="space-y-6">
                      {/* Attendance / Submission Rate KPI */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-5 rounded-2xl border border-surface-200 dark:border-surface-800 bg-gradient-to-br from-primary-500/10 to-accent-500/10 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-surface-950 border flex items-center justify-center shrink-0 text-primary-600 shadow-sm">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-secondary-500 tracking-wider">Timesheet Submission Rate</p>
                            <p className="text-3xl font-black text-secondary-900 dark:text-white mt-1">
                              {selectedEmployeeData?.submissionRate}%
                            </p>
                          </div>
                        </div>

                        <div className="p-5 rounded-2xl border border-surface-200 dark:border-surface-800 bg-gradient-to-br from-primary-500/10 to-accent-500/10 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-surface-950 border flex items-center justify-center shrink-0 text-primary-600 shadow-sm">
                            <Clock className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-secondary-500 tracking-wider">Avg Logged Hours/Day</p>
                            <p className="text-3xl font-black text-secondary-900 dark:text-white mt-1">
                              {selectedEmployeeData?.avgDailyHours}h
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Timeline of activities */}
                      <div className="border-t border-surface-100 dark:border-surface-800 pt-4">
                        <h4 className="font-bold text-sm text-secondary-900 dark:text-white mb-4 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-primary-500" />
                          Recent Activities Feed
                        </h4>
                        {selectedEmployeeData?.recentActivities.length === 0 ? (
                          <div className="py-12 text-center text-xs text-secondary-400 bg-surface-50 dark:bg-surface-800/10 rounded-xl">
                            No recent activities recorded for this employee.
                          </div>
                        ) : (
                          <div className="relative border-l border-surface-250 dark:border-surface-800 ml-3 pl-6 space-y-5">
                            {selectedEmployeeData?.recentActivities.map((act: any) => {
                              const isLeave = act.type === 'leave';
                              const isTS = act.type === 'timesheet';

                              return (
                                <div key={act.id} className="relative text-xs">
                                  {/* Bullet indicator */}
                                  <div className={cn('absolute -left-9 top-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-surface-900 shadow-sm',
                                    isLeave ? 'bg-rose-500' : isTS ? 'bg-emerald-500' : 'bg-primary-500'
                                  )} />

                                  <div className="flex justify-between items-start gap-4">
                                    <div>
                                      <p className="font-bold text-secondary-900 dark:text-white">{act.title}</p>
                                      <p className="text-secondary-600 mt-0.5">{act.desc}</p>
                                    </div>
                                    <span className="text-[10px] text-secondary-400 shrink-0 font-medium bg-surface-50 dark:bg-surface-800 px-2 py-0.5 rounded-full">
                                      {formatDate(act.date)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

// ─── MAIN PORTAL ROUTING ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { isAdmin, user } = useAuth();

  // Non-admins should never see this page — send them straight to their own profile.
  if (!isAdmin) {
    return <Navigate to={`/profile/${user?.id}`} replace />;
  }

  return <AdminDashboardView />;
}