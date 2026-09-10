import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Plus, Search, CheckCircle2, Clock, AlertTriangle,
  Pause, FolderKanban, Building2, MapPin, X, TrendingUp, LayoutGrid, List
} from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, cn } from '../utils/formatters';

interface Project {
  id: string;
  title: string;
  name: string;
  projectCode: string;
  clientName?: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  progress: number;
  location?: string;
  company?: string;
  createdAt: string;
}

const statusConfig: Record<string, { color: string; bg: string; icon: any }> = {
  planned: { color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200', icon: Clock },
  active: { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: TrendingUp },
  completed: { color: 'text-primary-700', bg: 'bg-primary-50 border-primary-200', icon: CheckCircle2 },
  on_hold: { color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Pause },
  delayed: { color: 'text-rose-700', bg: 'bg-rose-50 border-rose-200', icon: AlertTriangle },
  cancelled: { color: 'text-secondary-500', bg: 'bg-surface-100 border-surface-200', icon: X },
};

function getStatusCfg(status: string) {
  return statusConfig[status?.toLowerCase()] ?? statusConfig['planned'];
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const color = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-primary-500' : pct >= 30 ? 'bg-amber-500' : 'bg-rose-400';
  return (
    <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-500', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Projects() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatus] = useState('all');
  const [selected, setSelected] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [viewType, setViewType] = useState<'grid' | 'list'>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [projData, empData, assignData] = await Promise.all([
          api.get('/api/projects'),
          isAdmin ? api.get('/api/employees') : Promise.resolve([]),
          isAdmin ? api.get('/api/projects/assignments/all') : Promise.resolve([])
        ]);
        setProjects(projData);
        if (isAdmin) {
          setEmployees(empData);
          setAssignments(assignData);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load projects');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = projects;
    if (statusFilter !== 'all') list = list.filter(p => p.status === statusFilter);
    if (search) {
      const t = search.toLowerCase();
      list = list.filter(p =>
        p.title?.toLowerCase().includes(t) ||
        p.projectCode?.toLowerCase().includes(t) ||
        p.clientName?.toLowerCase().includes(t) ||
        p.description?.toLowerCase().includes(t)
      );
    }
    if (isAdmin && employeeFilter !== 'all') {
      const assignedProjectIds = new Set(
        assignments
          .filter((a: any) => String(a.employeeId) === String(employeeFilter))
          .map((a: any) => String(a.projectId))
      );
      list = list.filter(p => assignedProjectIds.has(String(p.id)));
    }
    return list;
  }, [projects, statusFilter, search, employeeFilter, assignments, isAdmin]);

  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
    delayed: projects.filter(p => p.status === 'delayed').length,
  }), [projects]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-primary-500" />
            Projects
          </h1>
          <p className="text-secondary-500 dark:text-surface-400 mt-1 text-sm">
            {isAdmin ? 'All projects from your organization' : 'Projects assigned to you'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-blue-50   text-blue-700' },
          { label: 'Active', value: stats.active, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Completed', value: stats.completed, color: 'bg-primary-50 text-primary-700' },
          { label: 'Delayed', value: stats.delayed, color: 'bg-rose-50   text-rose-700' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-2xl p-5 border', s.color, 'border-current/10')}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm font-medium mt-1 opacity-80">{s.label} Projects</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search by title, code, client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} className="input-field w-full sm:w-36 text-sm">
          <option value="all">All Status</option>
          <option value="planned">Planned</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="on_hold">On Hold</option>
          <option value="delayed">Delayed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {isAdmin && (
          <select value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)} className="input-field w-full sm:w-48 text-sm">
            <option value="all">All Employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        )}
        <div className="flex bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
          <button
            onClick={() => setViewType('grid')}
            className={cn("p-1.5 rounded-md transition-colors", viewType === 'grid' ? "bg-white dark:bg-surface-600 shadow-sm" : "text-surface-500 hover:text-surface-700")}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewType('list')}
            className={cn("p-1.5 rounded-md transition-colors", viewType === 'list' ? "bg-white dark:bg-surface-600 shadow-sm" : "text-surface-500 hover:text-surface-700")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full" />
        </div>
      ) : error ? (
        <div className="card p-8 text-center text-rose-600">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-rose-400" />
          <p className="font-semibold">Failed to load projects</p>
          <p className="text-sm text-secondary-500 mt-1">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderKanban className="w-12 h-12 mx-auto mb-4 text-secondary-300" />
          <p className="font-semibold text-secondary-600 dark:text-surface-300">No projects found</p>
          <p className="text-sm text-secondary-400 mt-1">
            {projects.length === 0 ? 'No projects exist in the database yet.' : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : viewType === 'list' ? (
        <div className="bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-secondary-500 bg-surface-50 dark:bg-surface-800/50 uppercase border-b border-surface-200 dark:border-surface-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Project</th>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium w-48">Progress</th>
                  <th className="px-6 py-4 font-medium text-right">Timeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                {filtered.map(project => {
                  const cfg = getStatusCfg(project.status);
                  const StatusIcon = cfg.icon;
                  return (
                    <tr
                      key={project.id}
                      onClick={() => setSelected(project)}
                      className="hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-secondary-900 dark:text-white mb-1 group-hover:text-primary-600 transition-colors">
                          {project.title}
                        </div>
                        {project.projectCode && (
                          <div className="text-xs font-mono text-secondary-400">
                            {project.projectCode}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-secondary-600 dark:text-surface-400">
                        {project.clientName || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>
                          <StatusIcon className="w-3 h-3" />
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <ProgressBar value={project.progress} />
                          </div>
                          <span className="text-xs font-medium text-secondary-600 dark:text-surface-400 w-8">
                            {project.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-secondary-500 whitespace-nowrap text-xs">
                        {project.startDate ? formatDate(project.startDate) : '—'}
                        <span className="mx-2">→</span>
                        {project.endDate ? formatDate(project.endDate) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(project => {
            const cfg = getStatusCfg(project.status);
            const StatusIcon = cfg.icon;
            return (
              <div
                key={project.id}
                className="card-hover p-6 cursor-pointer flex flex-col gap-4"
                onClick={() => setSelected(project)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border', cfg.bg, cfg.color)}>
                        <StatusIcon className="w-3 h-3" />
                        {project.status.replace('_', ' ')}
                      </span>
                      {project.projectCode && (
                        <span className="text-xs text-secondary-400 font-mono bg-surface-100 dark:bg-surface-800 px-2 py-0.5 rounded">
                          {project.projectCode}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-secondary-900 dark:text-white truncate">
                      {project.title}
                    </h3>
                    {project.clientName && (
                      <p className="text-xs text-secondary-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" /> {project.clientName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-sm text-secondary-600 dark:text-surface-400 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-secondary-600 dark:text-surface-400">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <ProgressBar value={project.progress} />
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-secondary-500 pt-2 border-t border-surface-100 dark:border-surface-800">
                  <span>{project.startDate ? formatDate(project.startDate) : '—'}</span>
                  <span>→</span>
                  <span>{project.endDate ? formatDate(project.endDate) : '—'}</span>
                </div>

                {/* Location / Company */}
                {(project.location || project.company) && (
                  <div className="flex items-center gap-2 text-xs text-secondary-400 -mt-2">
                    {project.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {project.location}
                      </span>
                    )}
                    {project.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {project.company}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <ProjectDetailModal project={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ProjectDetailModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const cfg = getStatusCfg(project.status);
  const StatusIcon = cfg.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white dark:bg-surface-900 rounded-2xl shadow-2xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-surface-100 dark:border-surface-800">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border', cfg.bg, cfg.color)}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {project.status.replace('_', ' ')}
                </span>
                {project.projectCode && (
                  <span className="text-xs font-mono text-secondary-400 bg-surface-100 dark:bg-surface-800 px-2 py-1 rounded">
                    {project.projectCode}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">{project.title}</h2>
              {project.clientName && (
                <p className="text-sm text-secondary-500 mt-1 flex items-center gap-1">
                  <Building2 className="w-4 h-4" /> {project.clientName}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600 transition-colors p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {project.description && (
            <div>
              <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-secondary-700 dark:text-surface-300 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs font-semibold text-secondary-400 uppercase tracking-wider">Progress</p>
              <span className="text-sm font-bold text-secondary-900 dark:text-white">{project.progress}%</span>
            </div>
            <div className="h-3 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700',
                  project.progress >= 100 ? 'bg-emerald-500' : project.progress >= 60 ? 'bg-primary-500' : project.progress >= 30 ? 'bg-amber-500' : 'bg-rose-400'
                )}
                style={{ width: `${Math.min(project.progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Start Date', value: project.startDate ? formatDate(project.startDate) : '—' },
              { label: 'End Date', value: project.endDate ? formatDate(project.endDate) : '—' },
              { label: 'Location', value: project.location || '—' },
              { label: 'Company', value: project.company || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
                <p className="text-xs text-secondary-400 uppercase tracking-wider">{label}</p>
                <p className="text-sm font-semibold text-secondary-900 dark:text-white mt-1">{value}</p>
              </div>
            ))}
          </div>

          {/* Created date */}
          <p className="text-xs text-secondary-400 text-center">
            Created {project.createdAt ? formatDate(project.createdAt) : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
