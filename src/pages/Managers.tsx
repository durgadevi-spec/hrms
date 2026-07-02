import { useState, useEffect } from 'react';
import { useDepartments } from '../context/DepartmentsContext';
import { api } from '../lib/api';
import { Crown, Users, Building2, LayoutGrid, List } from 'lucide-react';
import { cn } from '../utils/formatters';

export default function Managers() {
  const { departments } = useDepartments();
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    api.get('/api/employees').then(data => {
      setEmployees(data);
      setIsLoading(false);
    }).catch(console.error);
  }, []);

  const managers = employees.filter(e => e.role === 'manager' || e.role === 'admin');

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
            const managedDepts = departments.filter(d => d.managerIds?.includes(manager.id));
            const directReports = employees.filter(e => e.reportingManagerId === manager.id);

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
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-secondary-500">Departments</p>
                            <p className="text-sm font-medium text-secondary-900 dark:text-white">{managedDepts.length}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center text-success-600 dark:text-success-400">
                            <Users className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-secondary-500">Reports</p>
                            <p className="text-sm font-medium text-secondary-900 dark:text-white">{directReports.length}</p>
                          </div>
                        </div>
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
                  <th className="px-4 py-3 text-center text-xs font-semibold text-secondary-500 uppercase tracking-wider">Direct Reports</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {managers.map(manager => {
                  const managedDepts = departments.filter(d => d.managerIds?.includes(manager.id));
                  const directReports = employees.filter(e => e.reportingManagerId === manager.id);
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
                        <div className="inline-flex items-center gap-1.5 bg-surface-100 dark:bg-surface-800 px-2.5 py-1 rounded-md text-sm font-medium text-secondary-900 dark:text-white">
                          <Building2 className="w-3.5 h-3.5 text-primary-500" />
                          {managedDepts.length}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-surface-100 dark:bg-surface-800 px-2.5 py-1 rounded-md text-sm font-medium text-secondary-900 dark:text-white">
                          <Users className="w-3.5 h-3.5 text-success-500" />
                          {directReports.length}
                        </div>
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
  );
}
