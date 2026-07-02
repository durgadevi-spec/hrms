import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, CheckCircle2, XCircle, FileText, ChevronLeft, ChevronRight, AlertCircle, Users, BarChart3, Search, CalendarDays, ShieldAlert, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, cn } from '../utils/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Helper to parse '1h 27m' into a float
function parseTimeString(str: string | undefined | null) {
  if (!str) return 0;
  // If it's already a number string like "8.5"
  if (!str.includes('h') && !str.includes('m')) return parseFloat(str) || 0;
  const hMatch = str.match(/(\d+)h/);
  const mMatch = str.match(/(\d+)m/);
  const h = hMatch ? parseInt(hMatch[1]) : 0;
  const m = mMatch ? parseInt(mMatch[1]) : 0;
  return h + (m / 60);
}

// Helper to format local date to YYYY-MM-DD safely
function toLocalISOString(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Timesheets() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'my' | 'org'>('my');

  // My Timesheets State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Admin Detail State
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  // Data State
  const [data, setData] = useState<any>(null);
  const [orgData, setOrgData] = useState<any>(null);
  const [leavesData, setLeavesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMyData = async () => {
    setIsLoading(true);
    try {
      const [tsData, lvData] = await Promise.all([
        api.get('/api/timesheets?scope=my'),
        api.get('/api/leave-requests')
      ]);
      setData(tsData);
      setLeavesData(lvData);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to sync with TimeStrap database');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrgData = async () => {
    setIsLoading(true);
    try {
      const [tsData] = await Promise.all([
        api.get('/api/timesheets?scope=org')
      ]);
      setOrgData(tsData);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to sync org data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my') {
      if (!data) fetchMyData();
    } else if (activeTab === 'org' && isAdmin) {
      if (!orgData) fetchOrgData();
    }
  }, [activeTab, isAdmin]);

  if (isLoading && !data && !orgData) {
    return (
      <div className="card p-12 flex justify-center items-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-12 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-error-400 mb-4" />
        <p className="text-error-600 font-medium">{error}</p>
        <button onClick={activeTab === 'my' ? fetchMyData : fetchOrgData} className="mt-4 btn-secondary text-sm">Retry Sync</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-500" />
            TimeStrap Timesheets
          </h1>
          <p className="text-secondary-600 dark:text-surface-400 mt-1">Read-only live sync from external TimeStrap database</p>
        </div>

        {isAdmin && !selectedEmployee && (
          <div className="flex bg-surface-100 dark:bg-surface-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('my')}
              className={cn('px-4 py-2 text-sm font-medium rounded-md transition-all', activeTab === 'my' ? 'bg-white dark:bg-surface-900 shadow text-primary-600' : 'text-secondary-600')}
            >
              My Timesheets
            </button>
            <button
              onClick={() => setActiveTab('org')}
              className={cn('px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2', activeTab === 'org' ? 'bg-white dark:bg-surface-900 shadow text-primary-600' : 'text-secondary-600')}
            >
              <Users className="w-4 h-4" />
              Organization
            </button>
          </div>
        )}
      </div>

      {activeTab === 'my' && data && <EmployeeDashboard data={data} leavesData={leavesData} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}
      {activeTab === 'org' && isAdmin && orgData && !selectedEmployee && <AdminDashboard data={orgData} searchQuery={searchQuery} setSearchQuery={setSearchQuery} setSelectedEmployee={setSelectedEmployee} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />}

      {/* Employee Detail Modal/View for Admin */}
      {selectedEmployee && (
        <div className="space-y-6">
          <button onClick={() => setSelectedEmployee(null)} className="btn-ghost flex items-center gap-2 text-secondary-600">
            <ArrowLeft className="w-4 h-4" /> Back to Organization
          </button>
          <div className="card p-6 bg-primary-50/50 dark:bg-primary-900/10 border-primary-100 dark:border-primary-800">
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">{selectedEmployee.name}</h2>
            <p className="text-sm text-secondary-600 dark:text-surface-400">{selectedEmployee.employeeCode} | {selectedEmployee.department}</p>
          </div>

          <AdminEmployeeDrillDown employee={selectedEmployee} leavesData={leavesData} />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// EMPLOYEE DASHBOARD
// ------------------------------------------------------------------------------------------------

function EmployeeDashboard({ data, leavesData, selectedDate, setSelectedDate }: { data: any, leavesData: any, selectedDate: Date, setSelectedDate: (d: Date) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  // Date Navigations
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    return days;
  }, [currentMonth]);

  // Compute Missing Timesheets logic
  const monthCalculations = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);

    let totalWorkingDays = 0;
    let submittedDays = 0;
    let missingDates: Date[] = [];
    let leaveDays = 0;
    let weekendDays = 0;
    let totalHours = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isLeave = (dStr: string) => {
      if (!leavesData?.history) return false;
      return leavesData.history.some((l: any) => l.startDate && l.startDate.startsWith(dStr) && (l.status || '').toLowerCase() === 'approved');
    };

    const hasSubmission = (dStr: string) => {
      return data.dailySubmissions.some((s: any) => s.date === dStr);
    };

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = toLocalISOString(d);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

      if (isWeekend) {
        weekendDays++;
        continue;
      }

      if (isLeave(dStr)) {
        leaveDays++;
        continue;
      }

      // Valid working day
      totalWorkingDays++;

      if (hasSubmission(dStr)) {
        submittedDays++;
        // Add up hours for this day
        const entries = data.timeEntries.filter((e: any) => e.date === dStr);
        totalHours += entries.reduce((acc: number, e: any) => acc + parseTimeString(e.totalHours), 0);
      } else if (d <= today) {
        // Missing!
        missingDates.push(d);
      }
    }

    return {
      totalWorkingDays,
      submittedDays,
      missingDates,
      leaveDays,
      weekendDays,
      totalHours
    };
  }, [currentMonth, data, leavesData]);

  // Daily View Data
  const selectedDateStr = toLocalISOString(selectedDate);
  const dailyPlans = data.dailyPlans.filter((p: any) => p.date === selectedDateStr);
  const dailyPlanTasks = data.planTasks.filter((pt: any) => dailyPlans.some((p: any) => p.id === pt.planId));
  const dailyEntries = data.timeEntries.filter((e: any) => e.date === selectedDateStr);
  const dailySubmission = data.dailySubmissions.find((s: any) => s.date === selectedDateStr);

  const getDayStatus = (dStr: string) => {
    if (data.dailySubmissions.some((s: any) => s.date === dStr)) return 'submitted';
    if (leavesData?.history?.some((l: any) => l.startDate?.startsWith(dStr) && (l.status || '').toLowerCase() === 'approved')) return 'leave';
    return 'missing';
  };

  return (
    <div className="space-y-6">
      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard label="Working Days" value={monthCalculations.totalWorkingDays} color="primary" />
        <SummaryCard label="Submitted" value={monthCalculations.submittedDays} color="success" />
        <SummaryCard label="Missing" value={monthCalculations.missingDates.length} color="error" />
        <SummaryCard label="Leaves" value={monthCalculations.leaveDays} color="warning" />
        <SummaryCard label="Weekends" value={monthCalculations.weekendDays} color="secondary" />
        <SummaryCard label="Total Hours" value={`${monthCalculations.totalHours.toFixed(1)}h`} color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Col: Calendar & Missing List */}
        <div className="space-y-6 lg:col-span-1">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-secondary-900 dark:text-white capitalize">
                {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={nextMonth} className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors"><ChevronRight className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-surface-200 dark:bg-surface-700 rounded-lg overflow-hidden">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="bg-surface-50 dark:bg-surface-800/50 py-2 text-center text-xs font-semibold text-secondary-500">{day}</div>
              ))}

              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="bg-white dark:bg-surface-900 p-2 h-10" />;

                const dStr = toLocalISOString(date);
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const status = isWeekend ? 'weekend' : getDayStatus(dStr);

                // Color dots
                let dotColor = '';
                if (status === 'submitted') dotColor = 'bg-success-500';
                else if (status === 'missing' && date <= new Date()) dotColor = 'bg-error-500';
                else if (status === 'leave') dotColor = 'bg-warning-500';

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => { setSelectedDate(date); setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }}
                    className={cn("bg-white dark:bg-surface-900 p-2 h-12 border-t border-surface-100 dark:border-surface-800 transition-colors flex flex-col items-center hover:bg-surface-50", isSelected && "bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500 inset-0 z-10 relative")}
                  >
                    <span className={cn("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full", isSelected ? "bg-primary-600 text-white" : isWeekend ? "text-secondary-400" : "text-secondary-700 dark:text-surface-300")}>
                      {date.getDate()}
                    </span>
                    {dotColor && <div className={cn("w-1.5 h-1.5 rounded-full mt-0.5", dotColor)}></div>}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-secondary-500 justify-center">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-success-500"></div> Submitted</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-error-500"></div> Missing</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-warning-500"></div> Leave</div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden border-error-200">
            <div className="p-4 bg-error-50 border-b border-error-100 flex items-center justify-between">
              <h3 className="font-bold text-error-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                Missing Submissions
              </h3>
              <span className="badge bg-error-100 text-error-700">{monthCalculations.missingDates.length} Days</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {monthCalculations.missingDates.length === 0 ? (
                <div className="p-6 text-center text-secondary-500 text-sm">Perfect! No missing timesheets this month.</div>
              ) : (
                <table className="w-full text-sm text-left text-secondary-600 dark:text-surface-300">
                  <tbody>
                    {monthCalculations.missingDates.map((d, i) => (
                      <tr key={i} className="border-b border-surface-100 last:border-0 hover:bg-surface-50 cursor-pointer" onClick={() => setSelectedDate(d)}>
                        <td className="px-4 py-2 font-medium text-secondary-900">{formatDate(d.toISOString())}</td>
                        <td className="px-4 py-2">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}</td>
                        <td className="px-4 py-2"><span className="text-error-600 text-xs font-bold">Not Submitted</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Daily Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-surface-200 dark:border-surface-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
                {formatDate(selectedDate.toISOString())}
              </h2>
              <p className="text-sm text-secondary-600">{['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedDate.getDay()]}</p>
            </div>
            {dailySubmission ? (
              <div className="text-right">
                <span className="badge bg-success-100 text-success-700 text-sm px-3 py-1 mb-1 block w-fit ml-auto">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Submitted
                </span>
                {dailySubmission.submittedAt && (
                  <p className="text-xs text-secondary-500">at {new Date(dailySubmission.submittedAt).toLocaleTimeString()}</p>
                )}
              </div>
            ) : (
              <span className="badge bg-error-100 text-error-700 text-sm px-3 py-1">
                <XCircle className="w-4 h-4 mr-1" /> Not Submitted
              </span>
            )}
          </div>

          {/* Daily Plan Table */}
          <div className="card border border-surface-200">
            <div className="p-4 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200">
              <h3 className="font-bold text-secondary-900 dark:text-white flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary-500" /> Daily Plan</h3>
            </div>
            {dailyPlanTasks.length === 0 ? (
              <div className="p-6 text-center text-secondary-500 text-sm italic">No plan created for this day.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface-50 text-secondary-500 font-medium">
                    <tr>
                      <th className="px-4 py-2">Project</th>
                      <th className="px-4 py-2">Task</th>
                      <th className="px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {dailyPlanTasks.map((pt: any, i) => (
                      <tr key={i} className="hover:bg-surface-50">
                        <td className="px-4 py-3 font-medium text-secondary-900">{pt.projectName || '-'}</td>
                        <td className="px-4 py-3">{pt.taskName || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="badge bg-surface-100 text-secondary-700">{pt.status || 'Pending'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daily Time Entries Table */}
          <div className="card border border-surface-200">
            <div className="p-4 bg-surface-50 dark:bg-surface-800/50 border-b border-surface-200 flex justify-between items-center">
              <h3 className="font-bold text-secondary-900 dark:text-white flex items-center gap-2"><Clock className="w-4 h-4 text-primary-500" /> Time Entries</h3>
              {dailySubmission && <span className="font-bold text-primary-600">{dailySubmission.totalHours} Logged</span>}
            </div>
            {dailyEntries.length === 0 ? (
              <div className="p-6 text-center text-secondary-500 text-sm italic">No time entries logged.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface-50 text-secondary-500 font-medium">
                    <tr>
                      <th className="px-4 py-2 whitespace-nowrap">Time</th>
                      <th className="px-4 py-2">Project</th>
                      <th className="px-4 py-2 w-1/3">Description</th>
                      <th className="px-4 py-2 text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {dailyEntries.map((e: any, i) => (
                      <tr key={i} className="hover:bg-surface-50">
                        <td className="px-4 py-3 whitespace-nowrap text-secondary-500 font-mono text-xs">{e.startTime?.slice(0, 5)} - {e.endTime?.slice(0, 5)}</td>
                        <td className="px-4 py-3 font-medium text-secondary-900">{e.projectName || '-'}</td>
                        <td className="px-4 py-3 text-secondary-600 truncate max-w-[200px]" title={e.taskDescription}>{e.taskDescription || '-'}</td>
                        <td className="px-4 py-3 text-right font-bold text-primary-600">{e.totalHours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// ADMIN DASHBOARD
// ------------------------------------------------------------------------------------------------

function AdminDashboard({ data, searchQuery, setSearchQuery, setSelectedEmployee, selectedDate, setSelectedDate }: { data: any, searchQuery: string, setSearchQuery: (s: string) => void, setSelectedEmployee: (e: any) => void, selectedDate: Date, setSelectedDate: (d: Date) => void }) {

  // Organization Metrics
  const metrics = useMemo(() => {
    const selectedDateStr = toLocalISOString(selectedDate);
    const totalEmployees = data.employees.length;
    const submittedToday = data.dailySubmissions.filter((s: any) => s.date === selectedDateStr).length;
    const notSubmittedToday = totalEmployees - submittedToday;

    return { totalEmployees, submittedToday, notSubmittedToday, selectedDateStr };
  }, [data, selectedDate]);

  // Chart Data
  const chartData = [
    { name: 'Submitted', value: metrics.submittedToday, color: '#22c55e' },
    { name: 'Missing', value: metrics.notSubmittedToday, color: '#ef4444' }
  ];

  // Employee Table Data
  const employeeTable = useMemo(() => {
    return data.employees.map((emp: any) => {
      const empsSubmissions = data.dailySubmissions.filter((s: any) => s.employeeId === emp.id);
      const totalHours = empsSubmissions.reduce((sum: number, s: any) => sum + parseTimeString(s.totalHours), 0);
      const lastSub = empsSubmissions.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      // specific date info
      const planSubmitted = data.dailyPlans.some((p: any) => p.employeeId === emp.id && p.date === metrics.selectedDateStr);
      const timesheetSub = empsSubmissions.find((s: any) => s.date === metrics.selectedDateStr);

      return {
        ...emp,
        submittedDays: empsSubmissions.length,
        totalHours,
        lastSubmission: lastSub ? lastSub.date : 'Never',
        planSubmitted,
        timesheetSubmitted: !!timesheetSub,
        dailyHours: timesheetSub ? parseTimeString(timesheetSub.totalHours) : 0
      };
    }).filter((e: any) =>
      e.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.department?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a: any, b: any) => b.submittedDays - a.submittedDays);
  }, [data, searchQuery, metrics.selectedDateStr]);

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-500" />
          <input
            type="date"
            value={metrics.selectedDateStr}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            className="input-field pl-9 text-sm font-medium w-full sm:w-auto"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Total Active Employees" value={metrics.totalEmployees} color="primary" />
        <SummaryCard label={`Submitted (${metrics.selectedDateStr})`} value={metrics.submittedToday} color="success" />
        <SummaryCard label={`Pending (${metrics.selectedDateStr})`} value={metrics.notSubmittedToday} color="error" />
        <div className="card p-4 flex items-center justify-between border-l-4 border-l-accent-500">
          <div>
            <p className="text-sm text-secondary-600">Company Compliance</p>
            <p className="text-2xl font-bold mt-1 text-accent-600">{Math.round((metrics.submittedToday / (metrics.totalEmployees || 1)) * 100)}%</p>
          </div>
          <BarChart3 className="w-8 h-8 text-accent-200" />
        </div>
      </div>

      {/* Full-width Employee Tracking Table */}
      <div className="card p-0 flex flex-col">
        <div className="p-4 border-b border-surface-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-secondary-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" /> Employee Tracking
          </h3>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search employee, dept..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input-field pl-9 text-sm w-full"
            />
          </div>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-50 text-secondary-500 font-medium sticky top-0">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Dept</th>
                <th className="px-4 py-3 text-center">Plan ({metrics.selectedDateStr})</th>
                <th className="px-4 py-3 text-center">Sheet ({metrics.selectedDateStr})</th>
                <th className="px-4 py-3 text-right">Hrs ({metrics.selectedDateStr})</th>
                <th className="px-4 py-3 text-right">Submissions (30d)</th>
                <th className="px-4 py-3 text-right">Total Hours (30d)</th>
                <th className="px-4 py-3 text-right">Last Submission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {employeeTable.slice(0, 15).map((emp: any) => (
                <tr key={emp.id} onClick={() => setSelectedEmployee(emp)} className="hover:bg-surface-50 cursor-pointer transition-colors group">
                  <td className="px-4 py-3">
                    <p className="font-bold text-secondary-900 group-hover:text-primary-600 transition-colors">{emp.name}</p>
                    <p className="text-xs text-secondary-500 font-mono">{emp.employeeCode}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary-600">{emp.department || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {emp.planSubmitted ? <span className="badge bg-success-50 text-success-700">Yes</span> : <span className="badge bg-error-50 text-error-700">No</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {emp.timesheetSubmitted ? <span className="badge bg-success-50 text-success-700">Yes</span> : <span className="badge bg-error-50 text-error-700">No</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-secondary-900">{emp.dailyHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-right text-secondary-500">
                    <span className="badge bg-surface-100 text-secondary-700 font-bold">{emp.submittedDays} Days</span>
                  </td>
                  <td className="px-4 py-3 text-right text-secondary-500">{emp.totalHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-right text-secondary-500 text-xs">
                    {emp.lastSubmission !== 'Never' ? formatDate(emp.lastSubmission) : <span className="text-error-500">Never</span>}
                  </td>
                </tr>
              ))}
              {employeeTable.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-secondary-500 italic">No employees found matching your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pie Chart — below the table, centered */}
      <div className="card p-6 flex flex-col items-center">
        <h3 className="font-bold text-secondary-900 mb-4 w-full text-left">
          {formatDate(metrics.selectedDateStr)} Submission Rate
        </h3>
        <div className="w-full max-w-xs h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex gap-6 text-sm mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-success-500"></div>
            Submitted ({metrics.submittedToday})
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-error-500"></div>
            Missing ({metrics.notSubmittedToday})
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// REUSABLE COMPONENTS
// ------------------------------------------------------------------------------------------------

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: 'primary' | 'success' | 'error' | 'warning' | 'secondary' }) {
  const borderColors = {
    primary: 'border-l-primary-500',
    success: 'border-l-success-500',
    error: 'border-l-error-500',
    warning: 'border-l-warning-500',
    secondary: 'border-l-secondary-400'
  };

  return (
    <div className={cn("card p-4 border-l-4", borderColors[color])}>
      <p className="text-xs text-secondary-500 font-medium uppercase tracking-wider truncate mb-1">{label}</p>
      <p className="text-2xl font-bold text-secondary-900 dark:text-white">{value}</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// ADMIN DRILL DOWN
// ------------------------------------------------------------------------------------------------

function AdminEmployeeDrillDown({ employee, leavesData }: { employee: any, leavesData: any }) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  useEffect(() => {
    setIsLoading(true);
    api.get(`/api/timesheets?scope=employee&employeeId=${employee.id}`)
      .then(res => {
        setData(res);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, [employee.id]);

  // Filter leavesData for this specific employee based on employeeCode === LMS userId
  const filteredLeavesData = useMemo(() => {
    if (!leavesData) return null;
    return {
      ...leavesData,
      history: (leavesData.history || []).filter((l: any) => l.userId === employee.employeeCode)
    };
  }, [leavesData, employee]);

  if (isLoading) {
    return <div className="card p-12 flex justify-center items-center"><div className="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full" /></div>;
  }

  if (!data) return null;

  return (
    <div className="mt-8 border-t border-surface-200 pt-8">
      <EmployeeDashboard data={data} leavesData={filteredLeavesData} selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
    </div>
  );
}
