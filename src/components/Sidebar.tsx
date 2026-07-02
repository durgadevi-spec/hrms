import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/formatters';
import {
  LayoutDashboard, Users, FolderKanban, CalendarCheck, FileText,
  Package, Settings, LogOut, Building2, ChevronUp, Wallet, User, Crown
} from 'lucide-react';
import { useState } from 'react';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/employees', label: 'Employees', icon: Users, end: false },
  { to: '/managers', label: 'Managers', icon: Crown, end: false },
  { to: '/departments', label: 'Departments', icon: Building2, end: false },
];

const moduleLinks = [
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/timesheets', label: 'Timesheets', icon: CalendarCheck },
  { to: '/leaves', label: 'Leaves', icon: FileText },
  { to: '/assets', label: 'Assets', icon: Package },
];

function NavItem({ to, icon: Icon, label, end = false }: { to: string; icon: React.ElementType; label: string; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
          : 'text-secondary-600 dark:text-surface-300 hover:bg-secondary-50 dark:hover:bg-surface-800 hover:text-secondary-900 dark:hover:text-white'
      )}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, isAdmin, logout } = useAuth();
  const location = useLocation();
  const [showAdminMenu, setShowAdminMenu] = useState(true);
  const [showModulesMenu, setShowModulesMenu] = useState(true);

  if (!user) return null;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-800 lg:flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-surface-200 dark:border-surface-800 flex-shrink-0">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 shadow-md">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-secondary-900 dark:text-white">CTI</h1>
          <p className="text-xs text-secondary-500 dark:text-surface-400">Human Resource Management</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* My Profile — TOP for non-admin users */}
        {!isAdmin && (
          <div className="mb-3">
            <NavLink
              to={`/profile/${user.id}`}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800 shadow-sm'
                  : 'text-secondary-700 dark:text-surface-200 border-surface-200 dark:border-surface-700 hover:bg-secondary-50 dark:hover:bg-surface-800 hover:border-secondary-300'
              )}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-bold text-sm">
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate">{user.firstName} {user.lastName}</p>
                <p className="text-xs font-normal text-secondary-500 dark:text-surface-400 truncate">{user.designation}</p>
              </div>
              <User className="w-4 h-4 text-secondary-400 flex-shrink-0" />
            </NavLink>
          </div>
        )}

        {/* Admin Controls section */}
        {isAdmin && (
          <div className="mb-2">
            <button
              onClick={() => setShowAdminMenu(!showAdminMenu)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-secondary-400 dark:text-surface-500 uppercase tracking-widest hover:text-secondary-600 transition-colors cursor-pointer"
            >
              Admin Controls
              <ChevronUp className={cn('w-4 h-4 transition-transform duration-200', !showAdminMenu && 'rotate-180')} />
            </button>
            {showAdminMenu && (
              <div className="mt-1 space-y-0.5">
                {adminLinks.map(link => (
                  <NavItem key={link.to} to={link.to} icon={link.icon} label={link.label} end={link.end} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modules */}
        <div className={cn(isAdmin ? 'pt-2 mt-2 border-t border-surface-200 dark:border-surface-800' : 'mt-2')}>
          {isAdmin ? (
            <button
              onClick={() => setShowModulesMenu(!showModulesMenu)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-secondary-400 dark:text-surface-500 uppercase tracking-widest hover:text-secondary-600 transition-colors cursor-pointer"
            >
              Modules
              <ChevronUp className={cn('w-4 h-4 transition-transform duration-200', !showModulesMenu && 'rotate-180')} />
            </button>
          ) : null}

          {(!isAdmin || showModulesMenu) && (
            <div className="space-y-0.5 mt-1">
              {moduleLinks.map(link => (
                <NavItem key={link.to} to={link.to} icon={link.icon} label={link.label} />
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-surface-200 dark:border-surface-800 p-4 flex-shrink-0">
        {isAdmin && (
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-semibold">
              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-secondary-500 dark:text-surface-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <NavLink
            to="/settings"
            className={() => cn(
              'flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
              location.pathname === '/settings'
                ? 'bg-secondary-100 text-secondary-800 dark:bg-surface-800 dark:text-white'
                : 'text-secondary-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800'
            )}
          >
            <Settings className="w-4 h-4" />
            Settings
          </NavLink>
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-error-600 rounded-lg hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
