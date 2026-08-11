import { useState, useEffect } from 'react';
import { useDepartments } from '../context/DepartmentsContext';
import { api } from '../lib/api';
import { Crown, Users, Building2, LayoutGrid, List, X } from 'lucide-react';
import { cn } from '../utils/formatters';

function ManagerDetailsModal({ manager, reports, managedDepts, departments, mode, onClose }: { manager: any; reports: any[]; managedDepts: any[]; departments: any[]; mode: 'departments' | 'reports'; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-200 dark:border-surface-800">
          <div className="w-10 h-10 rounded-full bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-warning-600 dark:text-warning-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-secondary-900 dark:text-white">{manager.firstName} {manager.lastName}</h2>
            <p className="text-sm text-secondary-500">{mode === 'departments' ? `${managedDepts.length} linked department${managedDepts.length !== 1 ? 's' : ''}` : `${reports.length} team member${reports.length !== 1 ? 's' : ''}`}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 text-secondary-400" title="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {mode === 'departments' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Managed departments</h3>
            </div>
            {managedDepts.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {managedDepts.map(dept => (
                  <span key={dept.id} className="inline-flex items-center px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-sm font-medium text-primary-700 dark:text-primary-300">
                    {dept.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary-400">No departments linked.</p>
            )}
          </div>
          )}

          {mode === 'reports' && <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-success-500" />
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Team members</h3>
            </div>
            {reports.length > 0 ? (
              <div className="space-y-2">
              {reports.map(report => (
                <div key={report.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-sm font-bold text-primary-700 dark:text-primary-300">
                    {(report.firstName || '?').charAt(0)}{(report.lastName || '').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-secondary-900 dark:text-white truncate">{report.firstName} {report.lastName}</p>
                    <p className="text-xs text-secondary-500 truncate">
                      {report.designation || report.email || 'Employee'}
                      {report.departmentId && departments.find(dept => dept.id === report.departmentId)?.name
                        ? ` - ${departments.find(dept => dept.id === report.departmentId)?.name}`
                        : ''}
                    </p>
                  </div>
                </div>
              ))}
              </div>
            ) : (
              <p className="py-4 text-sm text-secondary-400">No team members found in the managed departments.</p>
            )}
          </div>}
        </div>
      </div>
    </div>
  );
}

export default function Managers() {
  const { departments } = useDepartments();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('list');
  const [selectedManager, setSelectedManager] = useState<any>(null);
  const [detailsMode, setDetailsMode] = useState<'departments' | 'reports'>('departments');

  useEffect(() => {
    api.get('/api/employees').then(data => {
      setEmployees(data);
      setIsLoading(false);
    }).catch(console.error);
  }, []);

  const managers = employees.filter(e => e.role === 'manager' || e.role === 'admin');

  const getManagedDepartments = (manager: any) =>
    departments.filter(department => department.managerIds?.includes(manager.id));

  const getTeamMembers = (manager: any) => {
    const managedDepartmentIds = new Set(getManagedDepartments(manager).map(department => department.id));
    return employees.filter(employee => managedDepartmentIds.has(employee.departmentId));
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-warning-500" />
            Managers
          </h1>
          <p className="text-secondary-600 dark:text-surface-400 mt-1">Directory of department leaders</p>
        </div>
        <div className="flex items-center gap-2 bg-surface-100 dark:bg-surface-800 p-1 rounded-lg">
          <button
            onClick={() => setView('grid')}
            className={cn('p-2 rounded-md transition-all', view === 'grid' ? 'bg-white dark:bg-surface-700 shadow-sm text-primary-600' : 'text-secondary-500 hover:text-secondary-700')}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('p-2 rounded-md transition-all', view === 'list' ? 'bg-white dark:bg-surface-700 shadow-sm text-primary-600' : 'text-secondary-500 hover:text-secondary-700')}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {managers.map(manager => {
            const managedDepts = getManagedDepartments(manager);
            const teamMembers = getTeamMembers(manager);

            return (
              <div key={manager.id} className="card overflow-hidden group">
                <div className="h-24 bg-gradient-to-r from-warning-400 to-warning-600" />
                <div className="px-6 pb-6 relative">
                  <div className="absolute -top-12 left-6">
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-surface-900 p-1.5 shadow-lg">
                      {manager.profilePicture ? (
                        <img src={manager.profilePicture} alt="" className="w-full h-full rounded-xl object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-xl bg-warning-100 dark:bg-warning-900/40 flex items-center justify-center text-xl font-bold text-warning-700 dark:text-warning-400">
                          {manager.firstName.charAt(0)}{manager.lastName.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-12">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-secondary-900 dark:text-white">{manager.firstName} {manager.lastName}</h3>
                        <p className="text-sm font-medium text-warning-600 dark:text-warning-400">{manager.designation}</p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
                        <button onClick={() => { setSelectedManager(manager); setDetailsMode('departments'); }} className="flex items-center gap-3 text-left hover:opacity-75 transition-opacity">
                          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-secondary-500">Departments</p>
                            <p className="text-sm font-medium text-secondary-900 dark:text-white">{managedDepts.length}</p>
                          </div>
                        </button>
                        <button onClick={() => { setSelectedManager(manager); setDetailsMode('reports'); }} className="flex items-center gap-3 text-left hover:opacity-75 transition-opacity">
                          <div className="w-8 h-8 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center text-success-600 dark:text-success-400">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-secondary-500">Team Members</p>
                            <p className="text-sm font-medium text-secondary-900 dark:text-white">{teamMembers.length}</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-50 dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Manager</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-500 uppercase tracking-wider">Designation</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Departments</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Team Members</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {managers.map(manager => {
                  const managedDepts = getManagedDepartments(manager);
                  const teamMembers = getTeamMembers(manager);
                  return (
                      <tr key={manager.id} className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning-400 to-warning-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                            {manager.firstName.charAt(0)}{manager.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-secondary-900 dark:text-white">{manager.firstName} {manager.lastName}</p>
                            <p className="text-xs text-secondary-500">{manager.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-secondary-600 dark:text-surface-300">
                        {manager.designation}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => { setSelectedManager(manager); setDetailsMode('departments'); }} className="inline-flex items-center gap-1.5 bg-surface-100 dark:bg-surface-800 px-2.5 py-1 rounded-md text-sm font-medium text-secondary-900 dark:text-white hover:bg-primary-50 dark:hover:bg-primary-900/20">
                          <Building2 className="w-3.5 h-3.5 text-primary-500" />
                          {managedDepts.length}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => { setSelectedManager(manager); setDetailsMode('reports'); }} className="inline-flex items-center gap-1.5 bg-surface-100 dark:bg-surface-800 px-2.5 py-1 rounded-md text-sm font-medium text-secondary-900 dark:text-white hover:bg-success-50 dark:hover:bg-success-900/20">
                          <Users className="w-3.5 h-3.5 text-success-500" />
                          {teamMembers.length}
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

      {selectedManager && (
        <ManagerDetailsModal
          manager={selectedManager}
          reports={getTeamMembers(selectedManager)}
          managedDepts={getManagedDepartments(selectedManager)}
          departments={departments}
          mode={detailsMode}
          onClose={() => setSelectedManager(null)}
        />
      )}
    </div>
  );
}
